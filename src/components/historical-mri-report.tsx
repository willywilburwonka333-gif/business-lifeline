"use client";

import type { ArchivedMri } from "@/lib/mri-cloud-archive";
import type { PlanAction } from "@/lib/types";

const money = (n:number,country:string) => new Intl.NumberFormat("en-AU", {
  style:"currency",currency:country.toLowerCase().includes("australia")?"AUD":"USD",
  maximumFractionDigits:0
}).format(n);

function HistoryActions({ title, actions }: { title:string;actions:PlanAction[] }) {
  return <section className="plan-section">
    <div className="section-heading"><h3>{title}</h3></div>
    <div className="action-grid">{actions.map((a,i) => <article className="action-card" key={i}>
      <div className="action-top"><strong>{a.title}</strong><span className="tag high">{a.urgency}</span></div>
      <p>{a.reason}</p>
      <small>Impact: {a.impact} · Difficulty: {a.difficulty}</small>
    </article>)}</div>
  </section>;
}

export function HistoricalMriReport({ entry, onBack }: { entry:ArchivedMri;onBack:()=>void }) {
  const { data, report } = entry.saved;
  const m = report.metrics;
  return <main id="main-content" className="report-shell">
    <header className="report-header no-print">
      <strong>Business Lifeline · Archived MRI</strong>
      <div>
        <button className="button ghost" type="button" onClick={onBack}>Back to reports</button>
        <button className="button primary" type="button" onClick={() => window.print()}>Print original report</button>
      </div>
    </header>
    <section className="report-title">
      <div><p className="eyebrow">ORIGINAL DATED MRI · READ ONLY</p><h1>{data.businessName}</h1>
        <p>{data.industry} · {data.country}</p></div>
      <p className="report-date">Recorded {new Date(entry.createdAt).toLocaleString("en-AU", {dateStyle:"long",timeStyle:"short"})}</p>
    </section>
    <aside className="panel" role="note">This is the historical snapshot, not a recalculation. Figures and conclusions reflect the information recorded at the time. Later changes are not included.</aside>
    <div className="metric-grid">
      <article><span>Health score at assessment</span><strong>{m.overallScore}/100</strong></article>
      <article><span>Monthly cash result</span><strong>{money(m.monthlyOperatingResult,data.country)}</strong></article>
      <article><span>Estimated cash runway</span><strong>{m.runwayMonths===null?"No monthly burn":`${m.runwayMonths} months`}</strong></article>
      <article><span>Evidence completeness (not verification)</span><strong>{m.dataConfidence}%</strong></article>
    </div>
    <aside className="panel"><h2>Evidence limitations</h2>
      <p>{m.cashFlowBasis==="cash-receipts-payments"?"Based on owner-reported cash receipts and payments; independent reconciliation was not guaranteed.":"Cash estimate uses invoiced revenue as a proxy for collections. The cash position requires verification."}</p>
      {report.urgentHelp && <p>Professional review was recommended for one or more serious risks.</p>}
    </aside>
    <section className="insight-grid">
      <article className="panel"><h3>Warnings recorded</h3><ul>{report.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></article>
      <article className="panel"><h3>Risks recorded</h3><ul>{report.risks.map((w,i)=><li key={i}>{w}</li>)}</ul></article>
    </section>
    <HistoryActions title="Immediate priorities" actions={report.today}/>
    <HistoryActions title="7-day recovery actions" actions={report.sevenDays}/>
    <HistoryActions title="30-day recovery actions" actions={report.thirtyDays}/>
    <HistoryActions title="90-day recovery actions" actions={report.ninetyDays}/>
    <footer className="disclaimer">Historical decision-support report, not a certified audit, legal opinion, tax advice or insolvency determination.</footer>
  </main>;
}
