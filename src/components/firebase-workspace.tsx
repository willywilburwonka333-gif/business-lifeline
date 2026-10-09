"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc, type DocumentSnapshot } from "firebase/firestore";
import { firebaseAuth, firebaseConfigured, firebaseDb } from "@/lib/firebase-client";

const CLOUD_KEYS = [
  "business-lifeline-mri-v2",
  "business-lifeline-report-v1",
  "business-lifeline-mri-import-v1",
  "business-lifeline-mri-smart-import-v1",
  "business-lifeline-records-v1",
  "business-lifeline-completed-actions-v1",
  "business-lifeline-recovery-coach-v1",
  "business-lifeline-recovery-history-v1",
  "business-lifeline-operating-system-v1",
  "business-lifeline-connected-operations-v2",
  "business-lifeline-operating-automation-v1",
  "business-lifeline-run-operating-core-v2",
  "business-lifeline-operating-platform-v1",
  "business-lifeline-live-control-v1",
  "business-lifeline-native-finance-v1",
  "business-lifeline-advanced-accounting-v1",
  "business-lifeline-books-settings-v1",
  "business-lifeline-commercial-finance-controls-v1",
  "business-lifeline-people-v1",
  "business-lifeline-tax-v1",
  "business-lifeline-spend-v1",
  "business-lifeline-assets-v1",
  "business-lifeline-plan-v1",
  "business-lifeline-fx-v1",
  "business-lifeline-document-vault-v1",
  "business-lifeline-ledger-sync-status-v1",
  "business-lifeline-record-sync-meta-v1",
  "business-lifeline-growth-plan-v1",
  "business-lifeline-exit-plan-v1",
  "business-lifeline-professional-validation-v1",
  "business-lifeline-warehouse-v1",
  "business-lifeline-automation-rules-v1",
  "business-lifeline-audit-v1",
  "business-lifeline-mri-history-v1",
] as const;
const CLOUD_PREFIXES = [
  "business-lifeline-13-week-v1:",
  "business-lifeline-accuracy-profile-v1:",
  "business-lifeline-cashflow-v2:",
] as const;

const businessIdFor = (uid: string) => `business-${uid}`;
const DEVICE_OWNER_KEY = "bl-session-owner-v1";
const SYNC_BASELINE_KEY = (uid: string) => `bl-cloud-fingerprint-v1:${uid}`;
const payloadFingerprint = (payload: CloudPayload): string => {
  // Non-cryptographic change detector, not a data-integrity signature.
  const serial = JSON.stringify(Object.keys(payload).sort().map(key => [key, payload[key]]));
  let hash = 2166136261;
  for (let i = 0; i < serial.length; i += 1) hash = Math.imul(hash ^ serial.charCodeAt(i), 16777619);
  return String(hash >>> 0);
};
async function clearVaultCache(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("business-lifeline-vault");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Could not clear the local document vault."));
    request.onblocked = () => reject(new Error("Local document vault is open in another tab. Close Business Lifeline in other tabs and retry."));
  });
}
function hasUnbackedVaultFiles(): boolean {
  try {
    const records: unknown = JSON.parse(localStorage.getItem("business-lifeline-document-vault-v1") || "[]");
    return Array.isArray(records) && records.some((record) => (
      record && typeof record === "object" && record.status === "stored" &&
      (record.cloudStatus !== "backed-up" || !record.cloudPath)
    ));
  } catch { return true; }
}
async function purgeBrowserClientData(): Promise<void> {
  // Wait for IndexedDB deletion before discarding the metadata needed to recover it.
  await clearVaultCache();
  const keys = Object.keys(localStorage).filter(key => key.startsWith("business-lifeline-"));
  keys.forEach(key => localStorage.removeItem(key));
}
type SyncState = "local" | "syncing" | "synced" | "error";
type CloudPayload = Record<string, string | null>;
type BillingStatus = { configured?: boolean; plan?: "free" | "pro" | "rescue"; subscriptionStatus?: string | null; rescuePurchased?: boolean; customerReady?: boolean };

function cloudEligibleKeys() {
  const keys = new Set<string>(CLOUD_KEYS);
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key && CLOUD_PREFIXES.some((prefix) => key.startsWith(prefix))) keys.add(key);
  }
  return [...keys];
}

function readLocalPayload(): CloudPayload {
  return Object.fromEntries(cloudEligibleKeys().map((key) => [key, window.localStorage.getItem(key)]));
}

function hasUsefulLocalData(payload: CloudPayload) {
  return Object.values(payload).some(Boolean);
}

function restoreLocalPayload(payload: Partial<CloudPayload>) {
  Object.entries(payload).forEach(([key, value]) => {
    const eligible = CLOUD_KEYS.includes(key as (typeof CLOUD_KEYS)[number]) || CLOUD_PREFIXES.some((prefix) => key.startsWith(prefix));
    if (eligible && typeof value === "string") window.localStorage.setItem(key, value);
  });
}

async function clearLocalPayload(): Promise<void> {
  await purgeBrowserClientData();
}

function messageForError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code.includes("email-already-in-use")) return "That email already has an account. Choose Sign in instead.";
  if (code.includes("invalid-credential")) return "The email or password is incorrect.";
  if (code.includes("weak-password")) return "Use a password with at least six characters.";
  if (code.includes("popup-closed")) return "Google sign-in was closed before it finished.";
  if (code.includes("permission-denied")) return "Cloud access is locked until the secure Firestore rules are published.";
  if (code.includes("too-many-requests")) return "Too many attempts. Wait briefly and try again.";
  return "That did not complete. Check the details and try again.";
}

export function FirebaseWorkspace({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseAuth);
  const authEpoch = useRef(0);
  const syncing = useRef(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [syncState, setSyncState] = useState<SyncState>("local");
  const [syncMessage, setSyncMessage] = useState("Stored privately on this device");
  const [billing, setBilling] = useState<BillingStatus>({ plan: "free" });

  const displayName = useMemo(() => user?.displayName || user?.email || "Business owner", [user]);
  const usesPassword = Boolean(user?.providerData.some((provider) => provider.providerId === "password"));

  const writeAudit = useCallback(async (activeUser: User, action: string, detail: string) => {
    if (!firebaseDb) return;
    const businessId = businessIdFor(activeUser.uid);
    try {
      await addDoc(collection(firebaseDb, "businesses", businessId, "auditEvents"), {
        action,
        detail,
        actorId: activeUser.uid,
        actorEmail: activeUser.email ?? null,
        createdAt: serverTimestamp(),
      });
    } catch {
      // Audit failure must not block the user's primary action.
    }
  }, []);

  const ensureCommercialWorkspace = useCallback(async (activeUser: User) => {
    if (!firebaseDb) return;
    const businessId = businessIdFor(activeUser.uid);
    const businessRef = doc(firebaseDb, "businesses", businessId);
    // A signed-in owner may create their own deterministic workspace but cannot
    // read a document that doesn't yet exist under the restrictive Firestore rules.
    // Treat ONLY permission-denied during this bootstrap read as "not yet
    // initialised"; the subsequent create still has to pass Firestore rules.
    let existingBusiness: DocumentSnapshot | null = null;
    try {
      existingBusiness = await getDoc(businessRef);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (!code.includes("permission-denied")) throw error;
    }
    await setDoc(businessRef, {
      id: businessId,
      name: existingBusiness?.exists() ? existingBusiness.data().name || "My Business Lifeline Workspace" : "My Business Lifeline Workspace",
      ownerId: activeUser.uid,
      status: "active",
      plan: existingBusiness?.exists() ? existingBusiness.data().plan || "beta" : "beta",
      updatedAt: serverTimestamp(),
      ...(!existingBusiness?.exists() ? { createdAt: serverTimestamp() } : {}),
    }, { merge: true });
    const ownerMemberRef = doc(firebaseDb, "businesses", businessId, "members", activeUser.uid);
    // Updating an existing owner membership is intentionally forbidden by the
    // security rules, so only create it on first account setup.
    const ownerMember = await getDoc(ownerMemberRef);
    if (!ownerMember.exists()) {
      await setDoc(ownerMemberRef, {
        userId: activeUser.uid,
        email: activeUser.email ?? null,
        role: "owner",
        status: "active",
        updatedAt: serverTimestamp(),
      });
    }
    await setDoc(doc(firebaseDb, "users", activeUser.uid, "businessMemberships", businessId), {
      businessId,
      role: "owner",
      status: "active",
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }, []);

  const syncWorkspace = useCallback(async (activeUser: User, mode: "auto" | "restore" | "push" = "auto"): Promise<boolean> => {
    if (!firebaseDb || firebaseAuth?.currentUser?.uid !== activeUser.uid) return false;
    if (syncing.current) return false;
    syncing.current = true;
    setSyncState("syncing");
    setSyncMessage("Checking account-owned cloud workspace…");
    try {
      await ensureCommercialWorkspace(activeUser);
      if (firebaseAuth?.currentUser?.uid !== activeUser.uid) return false;
      const workspaceRef = doc(firebaseDb, "userWorkspaces", activeUser.uid);
      const snapshot = await getDoc(workspaceRef);
      if (firebaseAuth?.currentUser?.uid !== activeUser.uid) return false;
      const localPayload = readLocalPayload();
      const cloudPayload = snapshot.exists() ? (snapshot.data().payload as CloudPayload | undefined) : undefined;
      const baselineKey = SYNC_BASELINE_KEY(activeUser.uid);
      const previousFingerprint = localStorage.getItem(baselineKey);
      const localFingerprint = payloadFingerprint(localPayload);
      const remoteFingerprint = payloadFingerprint(cloudPayload || {});
      const shouldRestore = Boolean(cloudPayload) && (
        mode === "restore" ||
        !hasUsefulLocalData(localPayload) ||
        (mode === "auto" && !previousFingerprint && remoteFingerprint !== localFingerprint) ||
        (mode === "auto" && previousFingerprint === localFingerprint && remoteFingerprint !== previousFingerprint)
      );
      if (shouldRestore && cloudPayload) {
        await clearLocalPayload();
        restoreLocalPayload(cloudPayload);
        localStorage.setItem(baselineKey, remoteFingerprint);
        localStorage.setItem(DEVICE_OWNER_KEY, activeUser.uid);
        await writeAudit(activeUser, "workspace.restore", "Restored account-owned cloud workspace.");
        setSyncState("synced");
        setSyncMessage("Cloud workspace restored");
        window.dispatchEvent(new Event("business-lifeline-account-restored"));
        return true;
      }
      if (mode === "auto" && cloudPayload && previousFingerprint &&
          remoteFingerprint !== previousFingerprint &&
          localFingerprint !== previousFingerprint &&
          localFingerprint !== remoteFingerprint) {
        setSyncState("error");
        setSyncMessage("Different changes exist on this device and in Firebase. Download a backup, then choose Restore cloud copy or Sync this device.");
        return false;
      }
      if (cloudPayload && remoteFingerprint === localFingerprint) {
        localStorage.setItem(baselineKey, remoteFingerprint);
        setSyncState("synced");
        setSyncMessage("Cloud workspace up to date");
        return true;
      }
      if (mode === "restore" && !cloudPayload) {
        setSyncState("error");
        setSyncMessage("No cloud workspace exists to restore.");
        return false;
      }
      if (firebaseAuth?.currentUser?.uid !== activeUser.uid) return false;
      await setDoc(workspaceRef, {
        ownerId: activeUser.uid,
        ownerEmail: activeUser.email ?? null,
        businessId: businessIdFor(activeUser.uid),
        payload: localPayload,
        updatedAt: serverTimestamp(),
        version: 3,
      }, { merge: true });
      localStorage.setItem(baselineKey, localFingerprint);
      localStorage.setItem(DEVICE_OWNER_KEY, activeUser.uid);
      await writeAudit(activeUser, "workspace.sync", "Synced this device to its owner account.");
      setSyncState("synced");
      setSyncMessage("Cloud workspace up to date");
      return true;
    } catch (syncError) {
      setSyncState("error");
      setSyncMessage(messageForError(syncError));
      return false;
    } finally {
      syncing.current = false;
    }
  }, [ensureCommercialWorkspace, writeAudit]);

  useEffect(() => {
    if (!firebaseAuth) return;
    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      const epoch = ++authEpoch.current;
      setAuthReady(false);
      setUser(nextUser);
      const init = async () => {
        const previousOwner = localStorage.getItem(DEVICE_OWNER_KEY);
        if (!nextUser) {
          if (previousOwner && previousOwner !== "guest") await clearLocalPayload();
          localStorage.setItem(DEVICE_OWNER_KEY, "guest");
          if (epoch === authEpoch.current) {
            setSyncState("local");
            setSyncMessage("Guest data stays on this device only");
            setBilling({ plan: "free" });
            setAuthReady(true);
          }
          return;
        }
        if (previousOwner !== nextUser.uid) {
          if (!previousOwner && hasUsefulLocalData(readLocalPayload())) {
            // Legacy unassigned browser data must never silently attach to a new client.
            const belongsToAccount = window.confirm("This browser contains data without an assigned account. Only import it if it belongs to this account. OK to keep it here for this owner, Cancel to clear it.");
            if (!belongsToAccount) await clearLocalPayload();
          } else {
            // Switching clients MUST remove all previous locally cached client information.
            await clearLocalPayload();
          }
          localStorage.setItem(DEVICE_OWNER_KEY, nextUser.uid);
          // A new account always treats the cloud as authoritative when it exists.
          localStorage.removeItem(SYNC_BASELINE_KEY(nextUser.uid));
        }
        const ok = await syncWorkspace(nextUser);
        if (epoch !== authEpoch.current) return;
        setAuthReady(ok);
        void nextUser.getIdToken().then(token => fetch("/api/billing/status", {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
        })).then(response => response.ok ? response.json() : null)
          .then(value => value && setBilling(value))
          .catch(() => setBilling({ plan: "free" }));
      };
      void init().catch(() => {
        // Fail closed: do not render another account over uncleared local documents.
        if (epoch === authEpoch.current) {
          setError("Client data could not be safely cleared. Close other Business Lifeline tabs, then reload and retry.");
          setPanelOpen(true);
          setAuthReady(false);
        }
      });
    });
  }, [syncWorkspace]);

  useEffect(() => {
    if (!user || !authReady) return;
    const timer = window.setInterval(() => void syncWorkspace(user), 30000);
    return () => window.clearInterval(timer);
  }, [syncWorkspace, user, authReady]);

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault();
    if (!firebaseAuth || !email.trim() || password.length < 6) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (createMode) {
        const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
        await sendEmailVerification(credential.user);
        setNotice("Account created. Check your email to verify it.");
      } else {
        await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      }
      setPanelOpen(false);
      setEmail("");
      setPassword("");
    } catch (authError) {
      setError(messageForError(authError));
    } finally {
      setBusy(false);
    }
  };

  const submitGoogle = async () => {
    if (!firebaseAuth) return;
    setBusy(true);
    setError("");
    try {
      await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      setPanelOpen(false);
    } catch (authError) {
      setError(messageForError(authError));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!firebaseAuth || !email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim());
      setNotice("Password reset email sent.");
    } catch (authError) {
      setError(messageForError(authError));
    } finally {
      setBusy(false);
    }
  };

  const resendVerification = async () => {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      await sendEmailVerification(user);
      setNotice("Verification email sent.");
    } catch (authError) {
      setError(messageForError(authError));
    } finally {
      setBusy(false);
    }
  };

  const exportWorkspace = async () => {
    const payload = readLocalPayload();
    const exportData = {
      exportedAt: new Date().toISOString(),
      formatVersion: 1,
      account: user ? { uid: user.uid, email: user.email } : null,
      payload,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `business-lifeline-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    if (user) await writeAudit(user, "workspace.export", "Downloaded a local JSON workspace export.");
    setNotice("Workspace export downloaded.");
  };

  const clearThisDevice = async () => {
    const confirmed = window.confirm("Sign out and clear Business Lifeline client data from this device? Cloud reports are preserved only when their backup has succeeded.");
    if (!confirmed) return;
    if (hasUnbackedVaultFiles()) {
      setError("Some document uploads are not backed up. Open Lifeline Vault and back up the local files before clearing.");
      setPanelOpen(true);
      return;
    }
    if (user && !(await syncWorkspace(user))) {
      setError("Cloud sync did not complete. Do not clear this device until the signed-in owner's backup is verified.");
      setPanelOpen(true);
      return;
    }
    setBusy(true);
    try {
      setAuthReady(false);
      await clearLocalPayload();
      if (user) await writeAudit(user, "workspace.local_clear", "Signed out and cleared this device after a successful workspace sync.");
      if (firebaseAuth?.currentUser) await signOut(firebaseAuth);
      localStorage.setItem(DEVICE_OWNER_KEY, "guest");
      window.location.reload();
    } catch (error) {
      setAuthReady(true);
      setError(error instanceof Error ? error.message : "Could not safely clear this device.");
      setPanelOpen(true);
      setBusy(false);
    }
  };

  const startCheckout = async (plan: "pro" | "rescue") => {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Unable to start checkout.");
      window.location.assign(payload.url);
    } catch (billingError) {
      setError(billingError instanceof Error ? billingError.message : "Unable to start checkout.");
      setBusy(false);
    }
  };

  const openBillingPortal = async () => {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/billing/portal", { method: "POST", headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Unable to open billing portal.");
      window.location.assign(payload.url);
    } catch (billingError) {
      setError(billingError instanceof Error ? billingError.message : "Unable to open billing portal.");
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (!firebaseAuth || !user) return;
    const confirmed = window.confirm("Permanently delete this Business Lifeline account and its owned cloud workspace data? This cannot be undone.");
    if (!confirmed) return;
    const typed = window.prompt('Type DELETE to confirm permanent account deletion.');
    if (typed !== "DELETE") return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account/delete", { method: "DELETE", headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      const payload = await response.json() as { deleted?: boolean; error?: string };
      if (!response.ok || !payload.deleted) throw new Error(payload.error || "Account deletion failed.");
      await clearLocalPayload();
      window.localStorage.removeItem("business-lifeline-active-business-v1");
      setNotice("Account deleted.");
      window.location.reload();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Account deletion failed.");
      setBusy(false);
    }
  };

  const logOut = async () => {
    if (!firebaseAuth || !user || !authReady) return;
    if (hasUnbackedVaultFiles()) {
      setError("Some uploaded documents are only on this device. Back them up from Lifeline Vault before signing out.");
      setPanelOpen(true);
      return;
    }
    const synced = await syncWorkspace(user);
    if (!synced) {
      setError("Cloud saving is incomplete. Download your data or resolve the sync warning before signing out.");
      setPanelOpen(true);
      return;
    }
    setAuthReady(false);
    try {
      await clearLocalPayload();
      localStorage.setItem(DEVICE_OWNER_KEY, "guest");
      await signOut(firebaseAuth);
      setPanelOpen(false);
      window.location.reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not safely sign out.");
      setAuthReady(true);
      setPanelOpen(true);
    }
  };

  return (
    <>
      <aside className="cloud-account-bar no-print" aria-label="Account and cloud workspace">
        <div>
          <strong>{user ? displayName : "Private local workspace"}</strong>
          <span className={`cloud-sync-state ${syncState}`}>{syncMessage}</span>
        </div>
        <div className="cloud-account-actions">
          {user && <button type="button" onClick={() => void syncWorkspace(user)}>Sync now</button>}
          <button type="button" onClick={() => setPanelOpen((open) => !open)}>{user ? "Account" : "Sign in / create account"}</button>
        </div>
      </aside>

      {panelOpen && (
        <section className="cloud-account-panel no-print" aria-label="Business Lifeline account">
          {!firebaseConfigured ? (
            <div><strong>Firebase configuration missing</strong><p>Add the seven NEXT_PUBLIC_FIREBASE variables in Vercel, then redeploy.</p></div>
          ) : user ? (
            <div className="cloud-account-signed-in">
              <small>SECURE ACCOUNT</small>
              <h2>{displayName}</h2>
              <p>Your Business Lifeline workspace remains available locally and can be copied to your private cloud workspace.</p>
              <div className="commercial-security-status">
                <strong>{usesPassword ? (user.emailVerified ? "Email verified" : "Email verification required") : "Verified Google account"}</strong>
                <span>Role: Owner · Workspace: Active beta · Plan: {billing.plan === "pro" ? "Pro" : billing.rescuePurchased ? "Rescue access" : "Free"}</span>
              </div>
              {usesPassword && !user.emailVerified && <button className="cloud-mode-switch" type="button" onClick={() => void resendVerification()} disabled={busy}>Resend verification email</button>}
              {billing.configured && <div className="cloud-account-panel-actions">
                {billing.plan !== "pro" && <button type="button" className="button primary" onClick={() => void startCheckout("pro")} disabled={busy}>Upgrade to Pro</button>}
                {!billing.rescuePurchased && <button type="button" className="button ghost" onClick={() => void startCheckout("rescue")} disabled={busy}>Buy Rescue package</button>}
                {billing.customerReady && <button type="button" className="button ghost" onClick={() => void openBillingPortal()} disabled={busy}>Manage billing</button>}
              </div>}
              {notice && <p className="cloud-account-notice" role="status">{notice}</p>}
              {error && <p className="cloud-account-error" role="alert">{error}</p>}
              <div className="cloud-account-panel-actions">
                <button type="button" className="button primary" onClick={() => { if (window.confirm("Replace the cloud workspace with this device’s copy? Download your data first if you are unsure.")) void syncWorkspace(user, "push"); }}>Sync this device</button>
                <button type="button" className="button ghost" onClick={() => void syncWorkspace(user, "restore").then(ok => { if (ok) window.location.reload(); })}>Restore cloud copy</button>
                <button type="button" className="button ghost" onClick={() => void exportWorkspace()}>Download my data</button>
                <button type="button" className="button ghost" onClick={() => void clearThisDevice()}>Clear this device</button>
                <button type="button" className="button ghost" onClick={() => void logOut()}>Sign out</button>
                <button type="button" className="button ghost" onClick={() => void deleteAccount()} disabled={busy}>Delete account permanently</button>
              </div>
            </div>
          ) : (
            <form onSubmit={submitEmail}>
              <small>OPTIONAL SECURE CLOUD ACCOUNT</small>
              <h2>{createMode ? "Create your account" : "Sign in"}</h2>
              <p>You can keep using Business Lifeline privately on this device. An account adds secure cloud backup and access across devices.</p>
              <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
              <label>Password<input type="password" autoComplete={createMode ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required /></label>
              {notice && <p className="cloud-account-notice" role="status">{notice}</p>}
              {error && <p className="cloud-account-error" role="alert">{error}</p>}
              <div className="cloud-account-panel-actions">
                <button className="button primary" type="submit" disabled={busy}>{busy ? "Please wait…" : createMode ? "Create account" : "Sign in"}</button>
                <button className="button ghost" type="button" onClick={submitGoogle} disabled={busy}>Continue with Google</button>
              </div>
              {!createMode && <button className="cloud-mode-switch" type="button" onClick={() => void resetPassword()} disabled={busy}>Forgot password?</button>}
              <button className="cloud-mode-switch" type="button" onClick={() => { setCreateMode((mode) => !mode); setError(""); setNotice(""); }}>{createMode ? "Already have an account? Sign in" : "New here? Create an account"}</button>
            </form>
          )}
        </section>
      )}

      {!authReady && <div className="cloud-auth-loading no-print" role="status">Checking and isolating account data… {user && <button type="button" onClick={() => void syncWorkspace(user, "restore").then(ok => { if (ok) { setAuthReady(true); window.location.reload(); } })}>Retry from cloud</button>}</div>}
      {authReady ? children : null}
    </>
  );
}
