"use client";

import { selectPlaybook } from "@/lib/recovery-playbooks";
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

const healthLabel = (score: number) => {
  if (score >= 70) return "Stable";
  if (score >= 45) return "Under pressure";
  return "Critical";
};

export function WorkspaceDashboard({ saved, openTab }: { saved: SavedReport; openTab: (tab: WorkspaceTab) => void }) {
  const { data, report } = saved;
  const metrics = report.metrics;
  const obligations = data.overdueTax + data.overdueSuppliers;
  const topActions = [...report.today, ...report.sevenDays].slice(0, 3);
  const topRisks = [...report.warnings, ...report.risks].filter((item, index, all) => all.indexOf(item) === index).slice(0, 3);
  const scoreTone = metrics.overallScore >= 70 ? "good" : metrics.overallScore >= 45 ? "watch" : "danger";
  const playbook = selectPlaybook(data, report);
  const primaryPressure = report.warnings[0] || report.risks[0] || playbook.summary;

  const shortcuts: Array<{ tab: WorkspaceTab; title: string; copy: string }> = [
    { tab: "brain", title: "Business Brain", copy: "Understand the diagnosis and ask grounded questions." },
    { tab: "cashflow", title: "Cashflow simulator", copy: "Test the financial effect of recovery decisions." },
    { tab: "operations", title: "Business OS", copy: "Turn the plan into owned, trackable weekly work." },
    { tab: "coach", title: "Recovery coach", copy: "Record progress, savings and money recovered." },
    { tab: "resources", title: "Resources", copy: "Use practical templates and the printable action sheet." },
  ];

  return (
    <section className="workspace-dashboard stage9-dashboard" aria-label="Business overview dashboard">
      <header className="workspace-dashboard-hero stage9-hero">
        <div className="stage9-hero-copy">
          <span className="workspace-kicker">Business recovery command centre</span>
          <h2>{data.businessName}</h2>
          <p>{data.immediateGoal || "Stabilise the business and restore control."}</p>
          <div className="stage9-hero-actions">
            <button className="button primary" type="button" onClick={() => openTab("recovery")}>Start recovery</button>
            <button className="button stage9-secondary" type="button" onClick={() => openTab("cashflow")}>Test a scenario</button>
          </div>
        </div>
        <div className={`workspace-score ${scoreTone}`}>
          <small>Business health</small>
          <strong>{metrics.overallScore}</strong>
          <span>/100</span>
          <b>{healthLabel(metrics.overallScore)}</b>
        </div>
      </header>

      <section className="stage9-pressure" aria-label="Primary pressure and recommended playbook">
        <div>
          <span>Primary pressure</span>
          <strong>{primaryPressure}</strong>
        </div>
        <div>
          <span>Recommended pathway</span>
          <button type="button" onClick={() => openTab("recovery")}>
            <strong>{playbook.name}</strong>
            <small>{playbook.severity} priority · Open playbook →</small>
          </button>
        </div>
      </section>

      <div className="workspace-metric-grid stage9-metrics">
        <article>
          <span>Monthly result</span>
          <strong className={metrics.monthlyOperatingResult < 0 ? "negative" : "positive"}>{money(metrics.monthlyOperatingResult, data.country)}</strong>
          <small>{metrics.monthlyOperatingResult < 0 ? "Loss at current settings" : "Positive at current settings"}</small>
        </article>
        <article>
          <span>Cash runway</span>
          <strong>{metrics.runwayMonths === null ? "Cash positive" : `${metrics.runwayMonths} months`}</strong>
          <small>{money(data.cashAvailable, data.country)} currently available</small>
        </article>
        <article>
          <span>Overdue invoices</span>
          <strong>{money(data.overdueInvoices, data.country)}</strong>
          <small>{data.overdueInvoices > 0 ? "Potential cash to collect" : "Nothing overdue recorded"}</small>
        </article>
        <article>
          <span>Overdue obligations</span>
          <strong className={obligations > 0 ? "negative" : ""}>{money(obligations, data.country)}</strong>
          <small>Tax and supplier arrears</small>
        </article>
      </div>

      <div className="workspace-dashboard-columns stage9-main-grid">
        <section className="workspace-summary-card stage9-priorities">
          <div className="workspace-card-heading">
            <div><span>Act first</span><h3>Top three priorities</h3></div>
            <button type="button" onClick={() => openTab("recovery")}>Full recovery plan →</button>
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

        <section className="workspace-summary-card stage9-risks">
          <div className="workspace-card-heading">
            <div><span>Watch closely</span><h3>Main risks</h3></div>
            <button type="button" onClick={() => openTab("brain")}>Ask Business Brain →</button>
          </div>
          <ul className="workspace-risk-list">
            {topRisks.length ? topRisks.map((risk, index) => <li key={`${risk}-${index}`}>{risk}</li>) : <li>No major risks were recorded in this MRI.</li>}
          </ul>
          {report.urgentHelp && (
            <aside className="workspace-alert">
              <strong>Professional help is recommended now.</strong>
              <span>The Recovery tab contains the escalation guidance.</span>
            </aside>
          )}
        </section>
      </div>

      <section className="workspace-shortcuts stage9-shortcuts">
        <div className="workspace-section-heading"><span>Next workspaces</span><h3>Move from insight to action</h3></div>
        <div className="workspace-shortcut-grid">
          {shortcuts.map((item) => (
            <button key={item.tab} type="button" onClick={() => openTab(item.tab)}>
              <strong>{item.title}</strong>
              <span>{item.copy}</span>
              <b>Open →</b>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
