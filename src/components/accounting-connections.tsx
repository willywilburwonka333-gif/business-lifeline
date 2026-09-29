"use client";

import { useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase-client";
import { accountingProviders, type AccountingProviderId } from "@/lib/accounting-integrations";
import { mergeImportDraft, readSmartImport, writeSmartImport, type ImportedField } from "@/lib/mri-smart-import";

type ConnectorConfig = {
  quickbooks?: { configured?: boolean; redirectUri?: string | null };
  xero?: { configured?: boolean };
  secureTokenVault?: boolean;
  firebaseAdmin?: boolean;
  liveConnectionsReady?: boolean;
};

type AccountingStatus = {
  connected?: boolean;
  organisationName?: string | null;
  lastSyncedAt?: string | null;
  sourceRecords?: number;
  financialSnapshot?: {
    revenue?: number; expenses?: number; cash?: number; accountsReceivable?: number;
    accountsPayable?: number; totalDebt?: number; periodStart?: string; periodEnd?: string;
  };
};

const statusLabel = (provider: AccountingProviderId, config: ConnectorConfig | null, quickbooks: AccountingStatus, xero: AccountingStatus) => {
  if (provider === "csv") return "Import available";
  if (provider === "quickbooks" && quickbooks.connected) return "Connected";
  if (provider === "quickbooks") return config?.quickbooks?.configured && config.liveConnectionsReady ? "Ready to connect" : "Setup required";
  if (provider === "xero" && xero.connected) return "Connected";
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
  const [quickbooks, setQuickbooks] = useState<AccountingStatus>({});
  const [xero, setXero] = useState<AccountingStatus>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/integrations/config", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((value) => setConfig(value))
      .catch(() => setConfig({}));

    const unsubscribe = firebaseAuth?.onAuthStateChanged(async (user) => {
      if (!user) { setQuickbooks({}); setXero({}); return; }
      try {
        const headers = await authHeaders();
        const [quickbooksResponse, xeroResponse] = await Promise.all([
          fetch("/api/integrations/quickbooks/status", { headers, cache: "no-store" }),
          fetch("/api/integrations/xero/status", { headers, cache: "no-store" }),
        ]);
        if (quickbooksResponse.ok) setQuickbooks(await quickbooksResponse.json());
        if (xeroResponse.ok) setXero(await xeroResponse.json());
      } catch { setQuickbooks({}); setXero({}); }
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
      if (!config?.xero?.configured || !config.liveConnectionsReady) {
        setMessage("Xero still needs its Xero app credentials, Firebase Admin service account and encrypted token vault configured in Vercel.");
        return;
      }
      try {
        setBusy(true);
        const response = await fetch("/api/integrations/xero/start", { method: "POST", headers: await authHeaders() });
        const payload = await response.json() as { url?: string; error?: string };
        if (!response.ok || !payload.url) throw new Error(payload.error || "Unable to start Xero connection.");
        window.location.assign(payload.url);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to connect Xero.");
        setBusy(false);
      }
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
      const payload = await response.json() as AccountingStatus & { error?: string };
      if (!response.ok) throw new Error(payload.error || "QuickBooks sync failed.");
      setQuickbooks(payload);
      const snapshot = payload.financialSnapshot;
      if (snapshot) {
        const period = snapshot.periodStart && snapshot.periodEnd ? `${snapshot.periodStart} to ${snapshot.periodEnd}` : undefined;
        const candidates: Array<[ImportedField["key"], number | undefined, string]> = [
          ["monthlyRevenue", snapshot.revenue, "QuickBooks Profit and Loss"],
          ["cashAvailable", snapshot.cash, "QuickBooks Balance Sheet"],
          ["accountsReceivable", snapshot.accountsReceivable, "QuickBooks Balance Sheet"],
          ["totalDebt", snapshot.totalDebt, "QuickBooks Balance Sheet"],
        ];
        const fields: ImportedField[] = candidates
          .filter((entry): entry is [ImportedField["key"], number, string] => typeof entry[1] === "number" && Number.isFinite(entry[1]))
          .map(([key, value, evidence]) => ({ key, value, source: "QuickBooks Online", confidence: "high", evidence, reportingPeriod: period }));
        if (fields.length) writeSmartImport(mergeImportDraft(readSmartImport(), fields));
      }
      setMessage(`QuickBooks synced for ${payload.organisationName || "the connected company"}. Financial facts were added to the MRI evidence layer for confirmation where needed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "QuickBooks sync failed.");
    } finally { setBusy(false); }
  };

  const syncXero = async () => {
    try {
      setBusy(true);
      const response = await fetch("/api/integrations/xero/sync", { method: "POST", headers: await authHeaders() });
      const payload = await response.json() as AccountingStatus & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Xero sync failed.");
      setXero(payload);
      const snapshot = payload.financialSnapshot;
      if (snapshot) {
        const period = snapshot.periodStart && snapshot.periodEnd ? `${snapshot.periodStart} to ${snapshot.periodEnd}` : undefined;
        const candidates: Array<[ImportedField["key"], number | undefined, string]> = [
          ["monthlyRevenue", snapshot.revenue, "Xero Profit and Loss"],
          ["cashAvailable", snapshot.cash, "Xero Balance Sheet"],
          ["accountsReceivable", snapshot.accountsReceivable, "Xero Balance Sheet"],
          ["totalDebt", snapshot.totalDebt, "Xero Balance Sheet"],
        ];
        const fields: ImportedField[] = candidates
          .filter((entry): entry is [ImportedField["key"], number, string] => typeof entry[1] === "number" && Number.isFinite(entry[1]))
          .map(([key, value, evidence]) => ({ key, value, source: "Xero", confidence: "high", evidence, reportingPeriod: period }));
        if (fields.length) writeSmartImport(mergeImportDraft(readSmartImport(), fields));
      }
      setMessage(`Xero synced for ${payload.organisationName || "the connected organisation"}. Financial facts were added to the MRI evidence layer for confirmation where needed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Xero sync failed.");
    } finally { setBusy(false); }
  };

  const disconnectXero = async () => {
    if (!window.confirm("Disconnect Xero and delete the stored connection tokens?")) return;
    try {
      setBusy(true);
      const response = await fetch("/api/integrations/xero/status", { method: "DELETE", headers: await authHeaders() });
      if (!response.ok) throw new Error("Xero could not be disconnected.");
      setXero({});
      setMessage("Xero disconnected and stored tokens deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Xero could not be disconnected.");
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

      {quickbooks.connected && <div className="accounting-connection-summary"><strong>{quickbooks.organisationName || "QuickBooks connected"}</strong><span>{quickbooks.lastSyncedAt ? `Last synced ${new Date(quickbooks.lastSyncedAt).toLocaleString()}` : "Ready for first sync"}</span><span>{quickbooks.sourceRecords || 0} invoice records detected</span><div><button className="button primary" type="button" onClick={syncQuickBooks} disabled={busy}>Sync QuickBooks</button><button className="button ghost" type="button" onClick={disconnectQuickBooks} disabled={busy}>Disconnect</button></div></div>}
      {xero.connected && <div className="accounting-connection-summary"><strong>{xero.organisationName || "Xero connected"}</strong><span>{xero.lastSyncedAt ? `Last synced ${new Date(xero.lastSyncedAt).toLocaleString()}` : "Ready for first sync"}</span><div><button className="button primary" type="button" onClick={syncXero} disabled={busy}>Sync Xero</button><button className="button ghost" type="button" onClick={disconnectXero} disabled={busy}>Disconnect</button></div></div>}

      <div className="accounting-provider-grid">
        {accountingProviders.map((provider) => (
          <article key={provider.id}>
            <header><div><small>{provider.connection === "oauth" ? "Secure connection" : "File import"}</small><h4>{provider.name}</h4></div><span>{statusLabel(provider.id, config, quickbooks, xero)}</span></header>
            <p>{provider.description}</p>
            <details><summary>Information Business Lifeline can use</summary><ul>{provider.dataScopes.map((scope) => <li key={scope}>{scope}</li>)}</ul></details>
            <button type="button" disabled={busy || (provider.id === "quickbooks" && quickbooks.connected) || (provider.id === "xero" && xero.connected)} className={provider.status === "planned" ? "button ghost" : "button primary"} onClick={() => connect(provider.id)}>{provider.id === "quickbooks" && quickbooks.connected ? "QuickBooks connected" : provider.id === "xero" && xero.connected ? "Xero connected" : provider.id === "csv" ? "Import accounting exports" : provider.status === "planned" ? "View planned connection" : `Connect ${provider.name}`}</button>
          </article>
        ))}
      </div>

      {message && <p className="scenario-save-status" role="status">{message}</p>}
      <div className="accounting-data-plan"><strong>Current live sync</strong><p>QuickBooks and Xero can both use read-only OAuth connections to bring the previous complete month Profit and Loss plus the current Balance Sheet into the MRI evidence layer. Production provider credentials and scopes must be configured before either live connection is offered to customers. Aged receivables/payables and transaction-level normalisation remain the next connector layer.</p></div>
    </section>
  );
}
