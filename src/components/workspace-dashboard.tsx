"use client";

import type { SavedReport } from "@/lib/saved-report";
import type { WorkspaceTab } from "@/lib/workspace";

const currencyFor = (country: string) => {
  const value = country.toLowerCase();
  if (value.includes("australia")) return "AUD";
  if (value.includes("new zealand")) return "NZD";
  if (value.includes("united kingdom")) return "GBP";
  if (value.includes("canada")) return "CAD";
  return "USD";
};

const money = (value: number, country: string) =>
  new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyFor(country),
    maximumFractionDigits: 0,
  }).format(value);

export function WorkspaceDashboard({ saved, openTab }: { saved: SavedReport; openTab: (tab: WorkspaceTab) => void }) {
  const { data, report } = saved;
  const overdue = data.overdueInvoices;
  const obligations = data.overdueTax + data.overdueSuppliers;
  const topActions = [...report.today, ...report.sevenDays].slice(0, 4);
  const topRisks = [...report.warnings, ...report.risks].slice(0, 4);
  const scoreTone = report.metrics.overallScore >= 70 ? "good" : report.metrics.overallScore >= 45 ? "watch" : "danger";

  const shortcuts: Array<{ tab: WorkspaceTab; title: string; copy: string; action: string }> = [
    { tab: "recovery", title: "Recovery plan", copy: "Timeline, playbook and priority actions.", action: "Open recovery" },
    { tab: "coach", title: "Recovery coach", copy: "Track calls, savings and money recovered.", action: "Open coach" },
    { tab: "brain", title: "Business Brain", copy: "Ask questions grounded in this MRI.", action: "Ask the Brain" },
    { tab: "cashflow", title: "Cashflow simulator", copy: "Test pricing, sales, costs and collections.", action: "Run a scenario" },
    { tab: "operations", title: "Business OS", copy: "Run tasks, contacts, team and controls.", action: "Open operations" },
    { tab: "resources", title: "Resources", copy: "Templates and printable action sheets.", action: "Open resources" },
  ];

  return (
    <section className="workspace-dashboard" aria-label="Business overview dashboard">
      <header className="workspace-dashboard-hero">
        <div>
          <span className="workspace-kicker">Business command dashboard</span>
          <h2>{data.businessName}</h2>
          <p>{data.immediateGoal || "Stabilise the business and restore control."}</p>
        </div>
        <div className={`workspace-score ${scoreTone}`}>
          <small>Health score</small>
          <strong>{report.metrics.overallScore}</strong>
          <span>/100</span>
        </div>
      </header>

      <div className="workspace-metric-grid">
        <article>
          <span>Monthly result</span>
          <strong className={report.metrics.monthlyOperatingResult < 0 ? "negative" : "positive"}>{money(report.metrics.monthlyOperatingResult, data.country)}</strong>
          <small>{report.metrics.monthlyOperatingResult < 0 ? "Operating loss needs action" : "Currently cash-generative"}</small>
        </article>
        <article>
          <span>Cash available</span>
          <strong>{money(data.cashAvailable, data.country)}</strong>
          <small>{report.metrics.runwayMonths === null ? "Positive monthly result" : `${report.metrics.runwayMonths} months estimated runway`}</small>
        </article>
        <article>
          <span>Overdue invoices</span>
          <strong>{money(overdue, data.country)}</strong>
          <small>{overdue > 0 ? "Potential near-term cash source" : "No overdue invoices recorded"}</small>
        </article>
        <article>
          <span>Overdue obligations</span>
          <strong className={obligations > 0 ? "negative" : ""}>{money(obligations, data.country)}</strong>
          <small>Tax and supplier arrears</small>
        </article>
      </div>

      <div className="workspace-dashboard-columns">
        <section className="workspace-summary-card">
          <div className="workspace-card-heading">
            <div><span>Do next</span><h3>Immediate priorities</h3></div>
            <button type="button" onClick={() => openTab("recovery")}>View full plan</button>
          </div>
          <div className="workspace-priority-list">
            {topActions.length ? topActions.map((action, index) => (
              <article key={`${action.title}-${index}`}>
                <b>{index + 1}</b>
                <div><strong>{action.title}</strong><p>{action.reason}</p></div>
                <span>{action.urgency}</span>
              </article>
            )) : <p className="workspace-empty">No immediate actions were generated.</p>}
          </div>
        </section>

        <section className="workspace-summary-card">
          <div className="workspace-card-heading">
            <div><span>Watch closely</span><h3>Main risks</h3></div>
            <button type="button" onClick={() => openTab("brain")}>Ask Business Brain</button>
          </div>
          <ul className="workspace-risk-list">
            {topRisks.length ? topRisks.map((risk, index) => <li key={`${risk}-${index}`}>{risk}</li>) : <li>No major risks were recorded in this MRI.</li>}
          </ul>
          {report.urgentHelp && <aside className="workspace-alert"><strong>Professional help is recommended.</strong><span>Use the Recovery tab to see the escalation guidance.</span></aside>}
        </section>
      </div>

      <section className="workspace-shortcuts">
        <div className="workspace-section-heading"><span>Workspaces</span><h3>Choose what you need to do</h3></div>
        <div className="workspace-shortcut-grid">
          {shortcuts.map((item) => (
            <button key={item.tab} type="button" onClick={() => openTab(item.tab)}>
              <strong>{item.title}</strong>
              <span>{item.copy}</span>
              <b>{item.action} →</b>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
