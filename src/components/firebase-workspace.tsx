"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
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
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
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
] as const;
const CLOUD_PREFIXES = [
  "business-lifeline-13-week-v1:",
  "business-lifeline-accuracy-profile-v1:",
  "business-lifeline-cashflow-v2:",
] as const;

const businessIdFor = (uid: string) => `business-${uid}`;
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

function clearLocalPayload() {
  cloudEligibleKeys().forEach((key) => window.localStorage.removeItem(key));
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
    await setDoc(doc(firebaseDb, "businesses", businessId), {
      name: "My Business Lifeline Workspace",
      ownerId: activeUser.uid,
      status: "active",
      plan: "beta",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true });
    await setDoc(doc(firebaseDb, "businesses", businessId, "members", activeUser.uid), {
      userId: activeUser.uid,
      email: activeUser.email ?? null,
      role: "owner",
      status: "active",
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }, []);

  const syncWorkspace = useCallback(async (activeUser: User, preferCloud = false) => {
    if (!firebaseDb) return;
    setSyncState("syncing");
    setSyncMessage("Syncing secure workspace…");
    try {
      await ensureCommercialWorkspace(activeUser);
      const workspaceRef = doc(firebaseDb, "userWorkspaces", activeUser.uid);
      const snapshot = await getDoc(workspaceRef);
      const localPayload = readLocalPayload();
      const cloudPayload = snapshot.exists() ? snapshot.data().payload as Partial<CloudPayload> | undefined : undefined;

      if (cloudPayload && (preferCloud || !hasUsefulLocalData(localPayload))) {
        restoreLocalPayload(cloudPayload);
        await writeAudit(activeUser, "workspace.restore", "Restored the cloud workspace onto this device.");
        setSyncState("synced");
        setSyncMessage("Cloud workspace restored");
        window.setTimeout(() => window.location.reload(), 350);
        return;
      }

      await setDoc(workspaceRef, {
        ownerId: activeUser.uid,
        ownerEmail: activeUser.email ?? null,
        businessId: businessIdFor(activeUser.uid),
        payload: localPayload,
        updatedAt: serverTimestamp(),
        version: 2,
      }, { merge: true });
      await writeAudit(activeUser, "workspace.sync", "Synced this device to the secure cloud workspace.");
      setSyncState("synced");
      setSyncMessage("Cloud workspace up to date");
    } catch (syncError) {
      setSyncState("error");
      setSyncMessage(messageForError(syncError));
    }
  }, [ensureCommercialWorkspace, writeAudit]);

  useEffect(() => {
    if (!firebaseAuth) return;
    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        void syncWorkspace(nextUser);
        void nextUser.getIdToken().then((token) => fetch("/api/billing/status", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })).then((response) => response.ok ? response.json() : null).then((value) => value && setBilling(value)).catch(() => setBilling({ plan: "free" }));
      }
      else {
        setSyncState("local");
        setSyncMessage("Stored privately on this device");
        setBilling({ plan: "free" });
      }
    });
  }, [syncWorkspace]);

  useEffect(() => {
    if (!user) return;
    const timer = window.setInterval(() => void syncWorkspace(user), 30000);
    return () => window.clearInterval(timer);
  }, [syncWorkspace, user]);

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
    const confirmed = window.confirm("Clear Business Lifeline data from this device? Your cloud copy is not deleted.");
    if (!confirmed) return;
    if (user) await writeAudit(user, "workspace.local_clear", "Cleared Business Lifeline data from one device.");
    clearLocalPayload();
    window.location.reload();
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
      clearLocalPayload();
      window.localStorage.removeItem("business-lifeline-active-business-v1");
      setNotice("Account deleted.");
      window.location.reload();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Account deletion failed.");
      setBusy(false);
    }
  };

  const logOut = async () => {
    if (!firebaseAuth) return;
    await signOut(firebaseAuth);
    setPanelOpen(false);
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
                <button type="button" className="button primary" onClick={() => void syncWorkspace(user)}>Sync this device</button>
                <button type="button" className="button ghost" onClick={() => void syncWorkspace(user, true)}>Restore cloud copy</button>
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

      {!authReady && <div className="cloud-auth-loading no-print">Checking secure workspace…</div>}
      {children}
    </>
  );
}
