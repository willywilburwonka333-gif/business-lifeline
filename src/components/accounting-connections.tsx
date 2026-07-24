"use client";

import { useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase-client";
import { accountingProviders, type AccountingProviderId } from "@/lib/accounting-integrations";

type ConnectorConfig = {
  quickbooks?: { configured?: boolean; redirectUri?: string | null };
  xero?: { configured?: boolean };
  secureTokenVault?: boolean;
  firebaseAdmin?: boolean;
  liveConnectionsReady?: boolean;
};

type QuickBooksStatus = {
  connected?: boolean;
  organisationName?: string | null;
  lastSyncedAt?: string | null;
  sourceRecords?: number;
};

const statusLabel = (provider: AccountingProviderId, config: ConnectorConfig | null, quickbooks: QuickBooksStatus) => {
  if (provider === "csv") return "Import available";
  if (provider === "quickbooks" && quickbooks.connected) return "Connected";
  if (provider === "quickbooks") return config?.quickbooks?.configured && config.liveConnectionsReady ? "Ready to connect" : "Setup required";
  if (provider === "xero") return config?.xero?.configured && config.liveConnectionsReady ? "Ready to connect" : "Setup required";
  return "Planned";
};

async function authHeaders() {
  const user = firebaseAuth?.currentUser;
  if (!user) throw new Error("Sign in to Business Lifeline before connecting accounting software.");
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}

export function AccountingConnections() {
  const [config, setConfig] = useState<ConnectorConfig | null>(null);
  const [quickbooks, setQuickbooks] = useState<QuickBooksStatus>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/integrations/config", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((value) => setConfig(value))
      .catch(() => setConfig({}));

    const unsubscribe = firebaseAuth?.onAuthStateChanged(async (user) => {
      if (!user) { setQuickbooks({}); return; }
      try {
        const response = await fetch("/api/integrations/quickbooks/status", { headers: await authHeaders(), cache: "no-store" });
        if (response.ok) setQuickbooks(await response.json());
      } catch { setQuickbooks({}); }
    });
    return () => unsubscribe?.();
  }, []);

  const connect = async (provider: AccountingProviderId) => {
    setMessage("");
    if (provider === "quickbooks") {
      if (!config?.quickbooks?.configured || !config.liveConnectionsReady) {
        setMessage("QuickBooks still needs its Intuit credentials, Firebase Admin service account and encrypted token vault configured in Vercel.");
        return;
      }
      try {
        setBusy(true);
        const response = await fetch("/api/integrations/quickbooks/start", { method: "POST", headers: await authHeaders() });
        const payload = await response.json() as { url?: string; error?: string };
        if (!response.ok || !payload.url) throw new Error(payload.error || "Unable to start QuickBooks connection.");
        window.location.assign(payload.url);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to connect QuickBooks.");
        setBusy(false);
      }
      return;
    }
    if (provider === "xero") {
      setMessage("The QuickBooks pipeline is being production-tested first. Xero will use the same secure connection pattern next.");
      return;
    }
    if (provider === "csv") {
      document.querySelector<HTMLElement>("[data-accounting-import]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      setMessage("Use Business Records to upload recognised accounting exports.");
      return;
    }
    setMessage("This provider will use the same secure OAuth pattern after QuickBooks and Xero are validated.");
  };

  const syncQuickBooks = async () => {
    try {
      setBusy(true);
      const response = await fetch("/api/integrations/quickbooks/sync", { method: "POST", headers: await authHeaders() });
      const payload = await response.json() as QuickBooksStatus & { error?: string };
      if (!response.ok) throw new Error(payload.error || "QuickBooks sync failed.");
      setQuickbooks(payload);
      setMessage(`QuickBooks synced for ${payload.organisationName || "the connected company"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "QuickBooks sync failed.");
    } finally { setBusy(false); }
  };

  const disconnectQuickBooks = async () => {
    if (!window.confirm("Disconnect QuickBooks and delete the stored connection tokens?")) return;
    try {
      setBusy(true);
      const response = await fetch("/api/integrations/quickbooks/status", { method: "DELETE", headers: await authHeaders() });
      if (!response.ok) throw new Error("QuickBooks could not be disconnected.");
      setQuickbooks({});
      setMessage("QuickBooks disconnected and stored tokens deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "QuickBooks could not be disconnected.");
    } finally { setBusy(false); }
  };

  return (
    <section className="panel accounting-connections no-print" aria-labelledby="accounting-connections-title">
      <div className="section-heading"><span>Connected accounting</span><h3 id="accounting-connections-title">Bring the whole financial picture into Business Lifeline</h3></div>
      <p className="template-note">Customers sign in on the provider's secure page. Business Lifeline receives approved access tokens—not passwords—and imports only the data needed for diagnosis, forecasting and recovery.</p>

      <aside className="urgent"><b>Security boundary</b><p>Connections use official OAuth, encrypted server-side token storage and the signed-in Business Lifeline account. Access can be disconnected at any time.</p></aside>

      {quickbooks.connected && <div className="accounting-connection-summary"><strong>{quickbooks.organisationName || "QuickBooks connected"}</strong><span>{quickbooks.lastSyncedAt ? `Last synced ${new Date(quickbooks.lastSyncedAt).toLocaleString()}` : "Ready for first sync"}</span><span>{quickbooks.sourceRecords || 0} invoice records detected</span><div><button className="button primary" type="button" onClick={syncQuickBooks} disabled={busy}>Sync now</button><button className="button ghost" type="button" onClick={disconnectQuickBooks} disabled={busy}>Disconnect</button></div></div>}

      <div className="accounting-provider-grid">
        {accountingProviders.map((provider) => (
          <article key={provider.id}>
            <header><div><small>{provider.connection === "oauth" ? "Secure connection" : "File import"}</small><h4>{provider.name}</h4></div><span>{statusLabel(provider.id, config, quickbooks)}</span></header>
            <p>{provider.description}</p>
            <details><summary>Information Business Lifeline can use</summary><ul>{provider.dataScopes.map((scope) => <li key={scope}>{scope}</li>)}</ul></details>
            <button type="button" disabled={busy || (provider.id === "quickbooks" && quickbooks.connected)} className={provider.status === "planned" ? "button ghost" : "button primary"} onClick={() => connect(provider.id)}>{provider.id === "quickbooks" && quickbooks.connected ? "QuickBooks connected" : provider.id === "csv" ? "Import accounting exports" : provider.status === "planned" ? "View planned connection" : `Connect ${provider.name}`}</button>
          </article>
        ))}
      </div>

      {message && <p className="scenario-save-status" role="status">{message}</p>}
      <div className="accounting-data-plan"><strong>Current live sync</strong><p>The first QuickBooks sync verifies the company, refreshes tokens securely and reads the company profile plus invoice count. Profit and loss, balance sheet, receivables, payables and transaction normalisation are the next connector layer.</p></div>
    </section>
  );
}
