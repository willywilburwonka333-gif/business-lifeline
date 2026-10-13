"use client";

import { useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase-client";

type Account = { uid: string; email: string; verified: boolean; createdAt: string; tier: "pilot" | "full" };

export function PilotAdministration() {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [busyUid, setBusyUid] = useState("");
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);

  const request = async (method: "GET" | "POST", body?: { uid: string; tier: "pilot" | "full" }) => {
    const user = firebaseAuth?.currentUser;
    if (!user) throw new Error("Sign in to manage access.");
    const response = await fetch("/api/pilot/accounts", {
      method,
      headers: { Authorization: `Bearer ${await user.getIdToken()}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Access management failed.");
    return data;
  };

  const refresh = async () => {
    try {
      setError("");
      const data = await request("GET") as { accounts: Account[]; truncated: boolean };
      setAccounts(data.accounts);
      setTruncated(data.truncated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load pilot accounts.");
    }
  };

  useEffect(() => { if (open) void refresh(); }, [open]);

  const change = async (account: Account) => {
    const tier = account.tier === "pilot" ? "full" : "pilot";
    if (!window.confirm(`${tier === "full" ? "Approve full module access for" : "Return to pilot-only access for"} ${account.email}?`)) return;
    setBusyUid(account.uid);
    try {
      await request("POST", { uid: account.uid, tier });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change access.");
    } finally { setBusyUid(""); }
  };

  return <section className="pilot-administration no-print">
    <button type="button" className="button ghost" onClick={() => setOpen(value => !value)}>{open ? "Close" : "Manage"} customer pilot approvals</button>
    {open && <div>
      <h2>Studio-only access approvals</h2>
      <p>New accounts receive pilot access automatically. Only you can approve full module access. These controls do not charge customers or certify advice.</p>
      <button type="button" className="button ghost" onClick={() => void refresh()}>Refresh accounts</button>
      {error && <p role="alert">{error}</p>}
      {truncated && <p>Showing the first 1,000 accounts. Pagination is needed for more.</p>}
      {accounts.length === 0 && <p>No customer accounts found yet.</p>}
      {accounts.map(account => <article key={account.uid} className="pilot-account-row">
        <strong>{account.email}</strong> · {account.tier === "full" ? "Full access" : "Pilot access"} · {account.verified ? "Verified email" : "Email not verified"}
        <button type="button" className="button ghost" disabled={busyUid === account.uid || (account.tier === "pilot" && !account.verified)} onClick={() => void change(account)}>{account.tier === "full" ? "Revoke full access" : "Approve full access"}</button>
      </article>)}
    </div>}
  </section>;
}
