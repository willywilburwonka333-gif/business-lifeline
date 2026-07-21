"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { firebaseAuth, firebaseDb } from "@/lib/firebase-client";

type Role = "owner" | "manager" | "staff" | "accountant";
type Membership = { businessId: string; name: string; role: Role; status: "active" | "inactive" };
type Member = { userId: string; email: string; displayName: string; role: Role; status: string };
type Invite = { token: string; businessId: string; businessName: string; email: string; role: Role; status: string };

const ACTIVE_KEY = "business-lifeline-active-business-v1";
const SOURCES = [
  ["operations", "business-lifeline-operating-platform-v1"],
  ["health", "business-lifeline-live-control-v1"],
  ["finance", "business-lifeline-advanced-accounting-v1"],
  ["banking", "business-lifeline-commercial-finance-controls-v1"],
  ["documents", "business-lifeline-document-vault-v1"],
] as const;

const token = () => crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase();
const canWrite = (role?: Role) => role === "owner" || role === "manager" || role === "staff";

export function TeamWorkspaceManager() {
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeId, setActiveId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [invite, setInvite] = useState({ email: "", role: "staff" as Role });
  const [inviteCode, setInviteCode] = useState("");
  const [latestInvite, setLatestInvite] = useState("");
  const localHashes = useRef<Record<string, string>>({});
  const applyingRemote = useRef(false);

  const active = memberships.find((item) => item.businessId === activeId);

  useEffect(() => {
    if (!firebaseAuth) return;
    return onAuthStateChanged(firebaseAuth, setUser);
  }, []);

  useEffect(() => {
    if (!firebaseDb || !user) {
      setMemberships([]);
      setActiveId("");
      return;
    }
    const ref = collection(firebaseDb, "users", user.uid, "businessMemberships");
    return onSnapshot(ref, (snapshot) => {
      const next = snapshot.docs.map((item) => item.data() as Membership).filter((item) => item.status === "active");
      setMemberships(next);
      const saved = localStorage.getItem(ACTIVE_KEY) || "";
      const selected = next.some((item) => item.businessId === saved) ? saved : next[0]?.businessId || "";
      setActiveId(selected);
      if (selected) localStorage.setItem(ACTIVE_KEY, selected);
    }, (error) => setNotice(error.message));
  }, [user]);

  useEffect(() => {
    if (!firebaseDb || !activeId || !user) {
      setMembers([]);
      return;
    }
    return onSnapshot(collection(firebaseDb, "businesses", activeId, "members"), (snapshot) => {
      setMembers(snapshot.docs.map((item) => item.data() as Member));
    });
  }, [activeId, user]);

  useEffect(() => {
    if (!firebaseDb || !activeId || !user) return;
    const stops = SOURCES.map(([module, key]) => onSnapshot(doc(firebaseDb!, "businesses", activeId, "modules", module), (snapshot) => {
      if (!snapshot.exists()) return;
      const remote = snapshot.data().payload;
      const serialised = typeof remote === "string" ? remote : JSON.stringify(remote);
      if (!serialised || serialised === localStorage.getItem(key)) return;
      applyingRemote.current = true;
      localStorage.setItem(key, serialised);
      localHashes.current[key] = serialised;
      window.dispatchEvent(new StorageEvent("storage", { key, newValue: serialised }));
      window.dispatchEvent(new CustomEvent("business-lifeline-shared-workspace-updated", { detail: { module } }));
      setTimeout(() => { applyingRemote.current = false; }, 100);
    }));
    return () => stops.forEach((stop) => stop());
  }, [activeId, user]);

  useEffect(() => {
    if (!firebaseDb || !activeId || !user || !canWrite(active?.role)) return;
    const sync = async () => {
      if (applyingRemote.current) return;
      for (const [module, key] of SOURCES) {
        const value = localStorage.getItem(key);
        if (value === null || value === localHashes.current[key]) continue;
        localHashes.current[key] = value;
        try {
          await setDoc(doc(firebaseDb!, "businesses", activeId, "modules", module), {
            module,
            payload: value,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
            updatedByEmail: user.email || "",
          }, { merge: true });
        } catch (error) {
          setNotice(error instanceof Error ? error.message : "Shared workspace sync failed.");
        }
      }
    };
    sync();
    const timer = window.setInterval(sync, 4000);
    return () => window.clearInterval(timer);
  }, [activeId, active?.role, user]);

  const createBusiness = async (event: FormEvent) => {
    event.preventDefault();
    if (!firebaseDb || !user || !businessName.trim()) return;
    const businessId = crypto.randomUUID();
    const name = businessName.trim();
    try {
      await runTransaction(firebaseDb, async (transaction) => {
        transaction.set(doc(firebaseDb!, "businesses", businessId), { id: businessId, name, ownerId: user.uid, status: "active", createdAt: serverTimestamp() });
        transaction.set(doc(firebaseDb!, "businesses", businessId, "members", user.uid), { userId: user.uid, email: user.email || "", displayName: user.displayName || user.email || "Owner", role: "owner", status: "active", joinedAt: serverTimestamp() });
        transaction.set(doc(firebaseDb!, "users", user.uid, "businessMemberships", businessId), { businessId, name, role: "owner", status: "active", joinedAt: serverTimestamp() });
      });
      localStorage.setItem(ACTIVE_KEY, businessId);
      setActiveId(businessId);
      setBusinessName("");
      setNotice(`${name} created. Existing device data will begin syncing into it.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Business creation failed.");
    }
  };

  const createInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (!firebaseDb || !user || !active || active.role !== "owner" && active.role !== "manager") return;
    const code = token();
    try {
      await setDoc(doc(firebaseDb, "businessInvites", code), {
        token: code,
        businessId: active.businessId,
        businessName: active.name,
        email: invite.email.trim().toLowerCase(),
        role: invite.role,
        status: "active",
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      setLatestInvite(code);
      setInvite({ email: "", role: "staff" });
      setNotice("Invite created. Share the code only with the intended person.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Invite creation failed.");
    }
  };

  const acceptInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (!firebaseDb || !user || !inviteCode.trim()) return;
    const code = inviteCode.trim().toUpperCase();
    try {
      const inviteRef = doc(firebaseDb, "businessInvites", code);
      const snapshot = await getDoc(inviteRef);
      if (!snapshot.exists()) throw new Error("Invite code was not found.");
      const data = snapshot.data() as Invite;
      if (data.status !== "active") throw new Error("This invite is no longer active.");
      if (data.email && data.email !== (user.email || "").toLowerCase()) throw new Error("This invite was created for a different email address.");
      await runTransaction(firebaseDb, async (transaction) => {
        transaction.set(doc(firebaseDb!, "businesses", data.businessId, "members", user.uid), { userId: user.uid, email: user.email || "", displayName: user.displayName || user.email || "Team member", role: data.role, status: "active", inviteId: code, joinedAt: serverTimestamp() });
        transaction.set(doc(firebaseDb!, "users", user.uid, "businessMemberships", data.businessId), { businessId: data.businessId, name: data.businessName, role: data.role, status: "active", joinedAt: serverTimestamp() });
        transaction.update(inviteRef, { status: "accepted", acceptedBy: user.uid, acceptedAt: serverTimestamp() });
      });
      setInviteCode("");
      setActiveId(data.businessId);
      localStorage.setItem(ACTIVE_KEY, data.businessId);
      setNotice(`Joined ${data.businessName} as ${data.role}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Invite acceptance failed.");
    }
  };

  const changeRole = async (member: Member, role: Role) => {
    if (!firebaseDb || !active || active.role !== "owner" || member.role === "owner") return;
    await updateDoc(doc(firebaseDb, "businesses", active.businessId, "members", member.userId), { role });
    await updateDoc(doc(firebaseDb, "users", member.userId, "businessMemberships", active.businessId), { role });
  };

  const removeMember = async (member: Member) => {
    if (!firebaseDb || !active || active.role !== "owner" || member.role === "owner") return;
    await deleteDoc(doc(firebaseDb, "businesses", active.businessId, "members", member.userId));
    await deleteDoc(doc(firebaseDb, "users", member.userId, "businessMemberships", active.businessId));
  };

  const switchBusiness = (businessId: string) => {
    setActiveId(businessId);
    localStorage.setItem(ACTIVE_KEY, businessId);
    localHashes.current = {};
    window.dispatchEvent(new CustomEvent("business-lifeline-business-switched", { detail: { businessId } }));
    setNotice("Business switched. Shared records are loading.");
  };

  const syncLabel = useMemo(() => active ? `${active.name} · ${active.role}` : "No shared business", [active]);

  if (!user) return null;
  return <>
    <button className="team-workspace-launcher" onClick={() => setOpen(true)} aria-label="Open business and team settings"><span>Business</span><strong>{syncLabel}</strong></button>
    {open && <div className="team-workspace-backdrop" role="dialog" aria-modal="true" aria-label="Business workspaces and team"><section className="team-workspace-panel">
      <header><div><small>SHARED BUSINESS WORKSPACES</small><h2>Businesses, team and live records</h2><p>Switch businesses, invite the right people and keep core operating modules updated across signed-in devices.</p></div><button onClick={() => setOpen(false)} aria-label="Close">×</button></header>
      {notice && <div className="team-notice">{notice}<button onClick={() => setNotice("")}>Dismiss</button></div>}
      <div className="team-grid">
        <section><h3>Your businesses</h3>{memberships.length ? memberships.map((item) => <button className={item.businessId === activeId ? "business-choice active" : "business-choice"} key={item.businessId} onClick={() => switchBusiness(item.businessId)}><strong>{item.name}</strong><span>{item.role}</span></button>) : <p>No shared businesses yet.</p>}
          <form onSubmit={createBusiness}><h4>Create another business</h4><input placeholder="Business name" value={businessName} onChange={(event) => setBusinessName(event.target.value)} /><button>Create business workspace</button></form>
          <form onSubmit={acceptInvite}><h4>Join with invite code</h4><input placeholder="Invite code" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} /><button>Join business</button></form>
        </section>
        <section><h3>Team</h3>{active ? <><p><strong>{active.name}</strong> · Your role: {active.role}</p>{members.map((member) => <article className="team-member" key={member.userId}><div><strong>{member.displayName || member.email}</strong><span>{member.email}</span></div><div>{active.role === "owner" && member.role !== "owner" ? <select value={member.role} onChange={(event) => changeRole(member, event.target.value as Role)}><option value="manager">Manager</option><option value="staff">Staff</option><option value="accountant">Accountant</option></select> : <span>{member.role}</span>}{active.role === "owner" && member.role !== "owner" && <button onClick={() => removeMember(member)}>Remove</button>}</div></article>)}
          {(active.role === "owner" || active.role === "manager") && <form onSubmit={createInvite}><h4>Invite a team member</h4><input type="email" placeholder="Their email" value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} /><select value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value as Role })}><option value="manager">Manager</option><option value="staff">Staff</option><option value="accountant">Accountant</option></select><button>Create secure invite code</button>{latestInvite && <output className="invite-code">{latestInvite}</output>}</form>}</> : <p>Create or join a business to manage a team.</p>}</section>
      </div>
      <footer><strong>Live modules:</strong> Operations, health, finance, banking and document metadata. Accountant access is read-only; staff cannot manage membership.</footer>
    </section></div>}
  </>;
}
