"use client";

import { useEffect, useState } from "react";
import { accountingProviders, type AccountingProviderId } from "@/lib/accounting-integrations";

type ConnectorConfig = {
  quickbooks?: { configured?: boolean };
  xero?: { configured?: boolean };
  secureTokenVault?: boolean;
};

const statusLabel = (provider: AccountingProviderId, config: ConnectorConfig | null) => {
  if (provider === "csv") return "Import available";
  if (provider === "quickbooks") return config?.quickbooks?.configured && config.secureTokenVault ? "Ready to connect" : "Setup required";
  if (provider === "xero") return config?.xero?.configured && config.secureTokenVault ? "Ready to connect" : "Setup required";
  return "Planned";
};

export function AccountingConnections() {
  const [config, setConfig] = useState<ConnectorConfig | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/integrations/config", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((value) => setConfig(value))
      .catch(() => setConfig({}));
  }, []);

  const connect = (provider: AccountingProviderId) => {
    if (provider === "quickbooks" || provider === "xero") {
      const ready = provider === "quickbooks"
        ? Boolean(config?.quickbooks?.configured && config.secureTokenVault)
        : Boolean(config?.xero?.configured && config.secureTokenVault);
      if (!ready) {
        setMessage(`${provider === "quickbooks" ? "QuickBooks" : "Xero"} needs its developer credentials and encrypted token vault configured before live connection can be enabled.`);
        return;
      }
      window.location.href = `/api/integrations/${provider}/start`;
      return;
    }
    if (provider === "csv") {
      document.querySelector<HTMLElement>("[data-accounting-import]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      setMessage("Use Business Records to upload recognised accounting exports. Direct field mapping is the next import step.");
      return;
    }
    setMessage("This provider will use the same secure OAuth pattern after QuickBooks and Xero are production-tested.");
  };

  return (
    <section className="panel accounting-connections no-print" aria-labelledby="accounting-connections-title">
      <div className="section-heading"><span>Connected accounting</span><h3 id="accounting-connections-title">Bring the whole financial picture into Business Lifeline</h3></div>
      <p className="template-note">Customers sign in on the accounting provider's own secure page. Business Lifeline receives approved access tokens—not passwords—and imports only the data needed for diagnosis, forecasting and recovery.</p>

      <aside className="urgent"><b>Important security boundary</b><p>Accounting apps cannot safely be embedded inside Business Lifeline or accessed by copying a user's login. The correct method is provider OAuth with revocable, limited access and encrypted server-side token storage.</p></aside>

      <div className="accounting-provider-grid">
        {accountingProviders.map((provider) => (
          <article key={provider.id}>
            <header><div><small>{provider.connection === "oauth" ? "Secure connection" : "File import"}</small><h4>{provider.name}</h4></div><span>{statusLabel(provider.id, config)}</span></header>
            <p>{provider.description}</p>
            <details><summary>Information Business Lifeline can use</summary><ul>{provider.dataScopes.map((scope) => <li key={scope}>{scope}</li>)}</ul></details>
            <button type="button" className={provider.status === "planned" ? "button ghost" : "button primary"} onClick={() => connect(provider.id)}>{provider.id === "csv" ? "Import accounting exports" : provider.status === "planned" ? "View planned connection" : `Connect ${provider.name}`}</button>
          </article>
        ))}
      </div>

      {message && <p className="scenario-save-status" role="status">{message}</p>}
      <div className="accounting-data-plan">
        <strong>First synchronisation priority</strong>
        <p>Profit and loss, balance sheet, aged receivables, aged payables, invoices, bills, payments, bank transactions, chart of accounts and business profile. Payroll and tax data remain provider- and permission-dependent.</p>
      </div>
    </section>
  );
}
