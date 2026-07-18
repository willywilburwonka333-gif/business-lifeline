"use client";

import { useEffect, useState } from "react";
import { demoBusiness, emptyBusiness } from "@/lib/demo";
import { generateReport } from "@/lib/planner";
import type { AiAnalysis, BusinessData, BusinessReport, PlanAction } from "@/lib/types";

const STORAGE_KEY = "business-lifeline-mri-v2";

const currencyFor = (country: string) => {
  const c = country.toLowerCase();
  if (c.includes("australia")) return "AUD";
  if (c.includes("new zealand")) return "NZD";
  if (c.includes("united kingdom") || c.includes("england") || c.includes("scotland") || c.includes("wales")) return "GBP";
  if (c.includes("canada")) return "CAD";
  if (c.includes("euro") || ["germany", "france", "italy", "spain", "ireland", "netherlands"].some(x => c.includes(x))) return "EUR";
  return "USD";
};

const money = (n: number, country: string) => new Intl.NumberFormat("en", {
  style: "currency",
  currency: currencyFor(country),
  maximumFractionDigits: 0,
}).format(n);

const numberFields: { key: keyof BusinessData; label: string; help?: string }[] = [
  { key: "monthlyRevenue", label: "Monthly revenue" },
  { key: "fixedExpenses", label: "Fixed expenses" },
  { key: "variableExpenses", label: "Variable expenses" },
  { key: "ownerDrawings", label: "Owner drawings" },
  { key: "loanRepayments", label: "Loan repayments" },
  { key: "cashAvailable", label: "Cash available" },
  { key: "accountsReceivable", label: "Accounts receivable", help: "All money currently owed by customers." },
  { key: "overdueInvoices", label: "Overdue customer invoices" },
  { key: "totalDebt", label: "Total business debt" },
  { key: "overdueTax", label: "Overdue tax" },
  { key: "overdueSuppliers", label: "Overdue supplier bills" },
];

const concerns = [
  ["payroll", "Unable to pay staff"],
  ["tax", "Serious overdue tax"],
  ["legal", "Legal demands"],
  ["debts", "Unable to pay debts as they fall due"],
  ["closure", "Imminent closure risk"],
  ["none", "None of these"],
];

function Field({ label, children, help }: { label: string; children: React.ReactNode; help?: string }) {
  return <label className="field"><span>{label}</span>{children}{help && <small>{help}</small>}</label>;
}

function Actions({ title, eyebrow, actions }: { title: string; eyebrow: string; actions: PlanAction[] }) {
  return <section className="plan-section">
    <div className="section-heading"><span>{eyebrow}</span><h3>{title}</h3></div>
    <div className="action-grid">{actions.map(item =>
      <article className="action-card" key={item.title}>
        <div className="action-top"><strong>{item.title}</strong><span className={`tag ${item.urgency.toLowerCase()}`}>{item.urgency}</span></div>
        <p>{item.reason}</p>
        <div className="meta"><span>Impact <b>{item.impact}</b></span><span>Difficulty <b>{item.difficulty}</b></span></div>
      </article>
    )}</div>
  </section>;
}

function AiView({ analysis }: { analysis: AiAnalysis }) {
  return <>
    <section className="panel"><p className="eyebrow">AI turnaround analysis</p><h2>What is really happening</h2><p>{analysis.diagnosis}</p></section>
    <section className="insight-grid">
      <article className="panel"><p className="eyebrow">Root causes</p><h3>Problems beneath the symptoms</h3><ul>{analysis.rootCauses.map(x => <li key={x}>{x}</li>)}</ul></article>
      <article className="panel"><p className="eyebrow">Information to confirm</p><h3>Questions that could change the plan</h3><ul>{analysis.questions.length ? analysis.questions.map(x => <li key={x}>{x}</li>) : <li>No major information gaps were identified.</li>}</ul></article>
    </section>
    <section className="plan-section"><div className="section-heading"><span>GPT-prioritised response</span><h3>Your highest-value moves</h3></div><div className="action-grid">{analysis.priorities.map(item => <article className="action-card" key={`${item.timeframe}-${item.title}`}><div className="action-top"><strong>{item.title}</strong><span className="tag high">{item.timeframe}</span></div><p>{item.why}</p><div className="meta"><span>Expected impact <b>{item.expectedImpact}</b></span></div>{item.caution && <small>{item.caution}</small>}</article>)}</div></section>
    {analysis.professionalHelp.recommended && <aside className="urgent" role="alert"><b>{analysis.professionalHelp.professionalType} recommended</b><p>{analysis.professionalHelp.reason}</p></aside>}
  </>;
}

function getSeverity(data: BusinessData, report: BusinessReport) {
  const score = report.metrics.overallScore;
  const seriousConcern = data.urgentConcerns.some(x => ["payroll", "legal", "debts", "closure"].includes(x));
  const overdueObligations = data.overdueTax + data.overdueSuppliers;
  const cannotCoverOverdues = overdueObligations > data.cashAvailable;

  if (seriousConcern || (score < 25 && cannotCoverOverdues)) {
    return { key: "escalate", label: "Immediate escalation", note: "Current indicators suggest serious financial distress. Contact an appropriate professional immediately." };
  }
  if (score < 45 || report.urgentHelp) {
    return { key: "critical", label: "Critical", note: "Significant financial stress is present. Professional advice should be considered now." };
  }
  if (score < 70) {
    return { key: "pressure", label: "Under pressure", note: "Early action is recommended before the pressure becomes harder to reverse." };
  }
  return { key: "stable", label: "Stable", note: "Continue strengthening the business and review the numbers regularly." };
}

function getPressures(data: BusinessData, report: BusinessReport) {
  const candidates: { label: string; weight: number }[] = [];
  const m = report.metrics;
  if (m.monthlyOperatingResult < 0) candidates.push({ label: "Negative cash flow", weight: 100 + Math.abs(m.monthlyOperatingResult) });
  if (data.overdueTax > 0 || data.overdueSuppliers > 0) candidates.push({ label: "Overdue obligations", weight: 90 + data.overdueTax + data.overdueSuppliers });
  if (m.expenseRatio > 100) candidates.push({ label: "Costs exceed revenue", weight: 80 + m.expenseRatio });
  if (data.overdueInvoices > 0) candidates.push({ label: "Slow customer payments", weight: 70 + data.overdueInvoices });
  if (m.debtPressure > 35) candidates.push({ label: "Debt pressure", weight: 60 + m.debtPressure });
  if (data.revenueTrend === "declining") candidates.push({ label: "Falling revenue", weight: 75 });
  if (data.revenueTrend === "volatile") candidates.push({ label: "Unstable revenue", weight: 65 });
  if (candidates.length === 0) candidates.push({ label: "Resilience and growth", weight: 1 });
  return candidates.sort((a, b) => b.weight - a.weight).map(x => x.label).slice(0, 4);
}

function ReportView({ data, report, onReset }: { data: BusinessData; report: BusinessReport; onReset: () => void }) {
  const { metrics: m } = report;
  const scoreTone = m.overallScore >= 70 ? "good" : m.overallScore >= 45 ? "watch" : "danger";
  const aiReady = report.aiStatus === "ready" && Boolean(report.aiAnalysis);
  const severity = getSeverity(data, report);
  const pressures = getPressures(data, report);
  const topActions = report.today.slice(0, 3);
  const obligations = data.overdueTax + data.overdueSuppliers;

  return <main id="main-content" className="report-shell">
    <header className="report-header no-print"><a className="brand" href="#main-content"><span>BL</span> Business Lifeline</a><div><button className="button ghost" onClick={onReset}>Start Again</button><button className="button primary" onClick={() => window.print()}>Print Report</button></div></header>
    <div className="report-title"><div><p className="eyebrow">Business MRI report</p><h1>{data.businessName}</h1><p>{data.industry} · {data.country}</p></div><p className="report-date">Prepared {new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date())}</p></div>

    <section className="executive-crisis-dashboard">
      <div className="crisis-score-block">
        <p className="eyebrow">Business health</p>
        <div className={`score-ring ${scoreTone}`}><strong>{m.overallScore}</strong><span>/ 100</span></div>
        <span className={`severity-badge ${severity.key}`}>{severity.label}</span>
        <p>{severity.note}</p>
      </div>
      <div className="crisis-diagnosis">
        <p className="eyebrow">Primary pressure</p>
        <h2>{pressures[0]}</h2>
        <p className="diagnosis-copy">This is the strongest pressure detected from the figures supplied. It is a decision-support finding, not a legal insolvency conclusion.</p>
        <div className="pressure-list"><span>Contributing pressures</span>{pressures.slice(1).map(x => <b key={x}>{x}</b>)}</div>
      </div>
      <div className="crisis-actions">
        <p className="eyebrow">Do these today</p>
        <ol>{topActions.map(action => <li key={action.title}><span>✓</span><div><b>{action.title}</b><small>{action.reason}</small></div></li>)}</ol>
      </div>
    </section>

    <section className="crisis-facts">
      <article><span>Monthly result</span><strong className={m.monthlyOperatingResult < 0 ? "negative" : "positive"}>{money(m.monthlyOperatingResult, data.country)}</strong></article>
      <article><span>Cash runway</span><strong>{m.runwayMonths === null ? "Cash positive" : `${m.runwayMonths} months`}</strong></article>
      <article><span>Overdue obligations</span><strong>{money(obligations, data.country)}</strong></article>
      <article><span>Professional help</span><strong>{report.urgentHelp ? "Recommended now" : m.overallScore < 70 ? "Consider early" : "Not urgent"}</strong></article>
    </section>

    <section className="nothing-changes-panel">
      <div><p className="eyebrow">If nothing changes</p><h2>The current pressure continues.</h2></div>
      <ul>
        {m.monthlyOperatingResult < 0 && <li>The business continues losing {money(Math.abs(m.monthlyOperatingResult), data.country)} per month at the current settings.</li>}
        {m.runwayMonths !== null && <li>Available cash covers approximately {m.runwayMonths} months of the current monthly loss.</li>}
        {obligations > 0 && <li>{money(obligations, data.country)} in overdue tax and supplier obligations may become harder to negotiate.</li>}
        <li>Review the plan after completing today&apos;s actions and whenever the figures materially change.</li>
      </ul>
    </section>

    <div className={`analysis-status ${aiReady ? "ready" : "fallback"}`} role="status"><span>{aiReady ? "AI-enhanced analysis completed" : "Rules-based safety report completed"}</span><small>{aiReady ? "Deterministic financial calculations plus personalised AI prioritisation" : "The core diagnosis and 90-day plan remain fully available without AI"}</small></div>
    {report.urgentHelp && <aside className="urgent" role="alert"><b>Urgent professional help recommended</b><p>Your answers indicate serious tax, payroll, legal, debt, or closure risk. Contact a qualified accountant, lawyer, turnaround adviser, or licensed insolvency professional now.</p></aside>}

    <section className="score-hero"><div className={`score-ring ${scoreTone}`}><strong>{m.overallScore}</strong><span>/ 100</span></div><div><p className="eyebrow">Overall business health</p><h2>{m.overallScore >= 70 ? "Stable, with room to strengthen" : m.overallScore >= 45 ? "Under pressure — act now" : "Critical — immediate action needed"}</h2><p>This score combines cash flow, runway, debt pressure, and revenue stability. It is a decision-support indicator, not a valuation or insolvency assessment.</p></div></section>
    <section className="metric-grid"><article><span>Monthly result</span><strong className={m.monthlyOperatingResult < 0 ? "negative" : "positive"}>{money(m.monthlyOperatingResult, data.country)}</strong><small>{m.operatingMargin}% operating margin</small></article><article><span>Cash runway</span><strong>{m.runwayMonths === null ? "Cash positive" : `${m.runwayMonths} months`}</strong><small>At the current monthly result</small></article><article><span>Expense ratio</span><strong>{m.expenseRatio}%</strong><small>Of monthly revenue</small></article><article><span>Debt pressure</span><strong>{m.debtPressure}%</strong><small>Of annualised revenue</small></article></section>
    {report.aiAnalysis ? <AiView analysis={report.aiAnalysis} /> : <section className="panel"><p className="eyebrow">Deterministic Business MRI</p><h3>Your core analysis is complete</h3><p>The financial diagnosis and rescue plan were generated from tested rules. AI-enhanced strategic analysis can be added when the service is available.</p></section>}
    <section className="insight-grid"><article className="panel"><p className="eyebrow">Main warnings</p><h3>What needs attention</h3><ul>{report.warnings.length ? report.warnings.map(x => <li key={x}>{x}</li>) : <li>No critical operating warnings detected.</li>}</ul></article><article className="panel"><p className="eyebrow">Strongest areas</p><h3>What you can build on</h3><ul className="strengths">{report.strengths.map(x => <li key={x}>{x}</li>)}</ul></article></section>
    <section className="risk-panel"><p className="eyebrow">Priority risks</p><h2>Top three risks</h2><div>{report.risks.length ? report.risks.map((x, i) => <article key={x}><span>0{i + 1}</span><p>{x}</p></article>) : <p>No major risks identified by the current rules.</p>}</div></section>
    <Actions title="Stop the immediate pressure" eyebrow="Actions for today" actions={report.today} />
    <Actions title="Stabilise cash and commitments" eyebrow="Seven-day plan" actions={report.sevenDays} />
    <Actions title="Repair the operating model" eyebrow="Thirty-day plan" actions={report.thirtyDays} />
    <Actions title="Build a more resilient business" eyebrow="Ninety-day plan" actions={report.ninetyDays} />
    <footer className="disclaimer">Business Lifeline provides decision-support information and does not replace professional accounting, legal, financial, or insolvency advice.</footer>
  </main>;
}

async function buildCompleteReport(data: BusinessData): Promise<BusinessReport> {
  const base = generateReport(data);
  let next: BusinessReport = { ...base, aiStatus: "fallback" };
  try {
    const response = await fetch("/api/analyse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data }) });
    if (response.ok) {
      const result = await response.json() as { analysis?: AiAnalysis };
      if (result.analysis) next = { ...base, aiAnalysis: result.analysis, aiStatus: "ready" };
    }
  } catch { /* deterministic report remains available */ }
  return next;
}

export function BusinessLifeline() {
  const [view, setView] = useState<"landing" | "form" | "report">("landing");
  const [step, setStep] = useState(0);
  const [data, setData] = useState<BusinessData>(emptyBusiness);
  const [report, setReport] = useState<BusinessReport | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const demoReport = generateReport(demoBusiness);

  useEffect(() => { const timer = window.setTimeout(() => { const saved = localStorage.getItem(STORAGE_KEY); if (saved) { try { const value = JSON.parse(saved); setData(value.data); setReport(value.report); setView("report"); } catch { localStorage.removeItem(STORAGE_KEY); } } setLoaded(true); }, 0); return () => window.clearTimeout(timer); }, []);
  const update = (key: keyof BusinessData, value: string | number | string[]) => setData(d => ({ ...d, [key]: value }));
  const saveAndShow = (nextData: BusinessData, nextReport: BusinessReport) => { setData(nextData); setReport(nextReport); localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: nextData, report: nextReport })); setView("report"); window.scrollTo(0, 0); };
  const useDemo = async () => { setError(""); setAnalysing(true); const next = await buildCompleteReport(demoBusiness); saveAndShow(demoBusiness, next); setAnalysing(false); };
  const reset = () => { localStorage.removeItem(STORAGE_KEY); setData(emptyBusiness); setReport(null); setStep(0); setView("landing"); window.scrollTo(0, 0); };
  const nextStep = () => { const required = step === 0 ? [data.businessName, data.industry, data.country] : step === 2 ? [data.biggestProblem, data.immediateGoal] : ["ok"]; if (required.some(x => !String(x).trim())) { setError("Please complete every required field before continuing."); return; } setError(""); setStep(s => Math.min(2, s + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!data.biggestProblem.trim() || !data.immediateGoal.trim()) { setError("Tell us your biggest problem and immediate goal to build the plan."); return; } setError(""); setAnalysing(true); const next = await buildCompleteReport(data); saveAndShow(data, next); setAnalysing(false); };

  if (!loaded) return <main id="main-content" className="loading" aria-label="Loading Business Lifeline" />;
  if (view === "report" && report) return <ReportView data={data} report={report} onReset={reset} />;
  if (view === "landing") return <main id="main-content" className="landing"><nav><a className="brand light" href="#main-content"><span>BL</span> Business Lifeline</a><button className="nav-link" onClick={() => setView("form")}>Start your MRI <span>→</span></button></nav><section className="hero"><div className="hero-copy"><p className="pill">A clear plan when business feels uncertain</p><h1>Business<br/><em>Lifeline.</em></h1><p className="subheading">Find what is hurting your business. Know exactly what to do next.</p><div className="hero-actions"><button className="button primary large" onClick={() => setView("form")} disabled={analysing}>Run My Business MRI <span>→</span></button><button className="button outline large" onClick={useDemo} disabled={analysing}>{analysing ? "Analysing demo…" : "Try Demo Business"}</button></div><p className="privacy">Private by design · Your report is stored in this browser</p></div><div className="hero-card"><div className="mini-head"><span>BUSINESS MRI</span><span>RIVERBEND CAFÉ</span></div><div className="mini-score"><span>Health score</span><strong>{demoReport.metrics.overallScore}<small>/100</small></strong><div><i style={{ width: `${demoReport.metrics.overallScore}%` }}/></div><p>Immediate action recommended</p></div><div className="mini-stats"><span><small>MONTHLY RESULT</small><b>{money(demoReport.metrics.monthlyOperatingResult, demoBusiness.country)}</b></span><span><small>CASH RUNWAY</small><b>{demoReport.metrics.runwayMonths} mo</b></span></div><div className="mini-action"><b>01</b><span><small>DO THIS TODAY</small>{demoReport.today[1]?.title || demoReport.today[0]?.title}</span><i>→</i></div></div></section><section className="steps"><div><p className="eyebrow">Your path forward</p><h2>Clarity in three steps.</h2></div>{[["01","Diagnose the problem","See the numbers behind the pressure — without jargon or guesswork."],["02","Prioritise urgent actions","Separate what needs attention today from what can wait."],["03","Build a rescue plan","Leave with practical actions for the next 90 days."]].map(x => <article key={x[0]}><span>{x[0]}</span><div className="step-icon">{x[0] === "01" ? "⌁" : x[0] === "02" ? "!" : "✓"}</div><h3>{x[1]}</h3><p>{x[2]}</p></article>)}</section><section className="closing"><p className="eyebrow">Take the first step</p><h2>Your business can feel<br/>manageable again.</h2><button className="button primary large" onClick={() => setView("form")}>Start your free Business MRI <span>→</span></button></section><footer className="landing-footer"><a className="brand light" href="#main-content"><span>BL</span> Business Lifeline</a><p>Business Lifeline provides decision-support information and does not replace professional advice.</p></footer></main>;

  return <main id="main-content" className="form-shell"><header className="form-header"><button className="brand button-reset" onClick={() => setView("landing")}><span>BL</span> Business Lifeline</button><small>Business MRI · Step {step + 1} of 3</small></header><div className="progress"><i style={{ width: `${((step + 1) / 3) * 100}%` }} /></div><form onSubmit={submit} noValidate><div className="form-intro"><p className="eyebrow">{step === 0 ? "Your business" : step === 1 ? "The numbers" : "Pressure & priorities"}</p><h1>{step === 0 ? "Let’s get the basics." : step === 1 ? "How is cash moving?" : "What needs attention?"}</h1><p>{step === 0 ? "This helps us put your numbers in context." : step === 1 ? "Use a typical recent month. Estimates are fine — honest is more useful than perfect." : "Your context helps turn the diagnosis into a practical rescue plan."}</p></div>{step === 0 && <div className="fields"><Field label="Business name"><input required value={data.businessName} onChange={e => update("businessName", e.target.value)} placeholder="e.g. Riverbend Café" /></Field><Field label="Industry"><input required value={data.industry} onChange={e => update("industry", e.target.value)} placeholder="e.g. Café and hospitality" /></Field><Field label="Country"><input required value={data.country} onChange={e => update("country", e.target.value)} placeholder="e.g. Australia" /></Field><div className="two-cols"><Field label="Years operating"><input type="number" min="0" required value={data.yearsOperating} onChange={e => update("yearsOperating", Number(e.target.value))} /></Field><Field label="Number of employees"><input type="number" min="0" required value={data.employees} onChange={e => update("employees", Number(e.target.value))} /></Field></div></div>}{step === 1 && <div className="fields money-fields">{numberFields.map(f => <Field key={String(f.key)} label={f.label} help={f.help}><div className="money-input"><span>$</span><input type="number" min="0" step="any" required aria-label={`${f.label} amount`} value={data[f.key] as number} onChange={e => update(f.key, Number(e.target.value))} /></div></Field>)}</div>}{step === 2 && <div className="fields"><Field label="Revenue trend"><select value={data.revenueTrend} onChange={e => update("revenueTrend", e.target.value)}><option value="growing">Growing</option><option value="stable">Stable</option><option value="declining">Declining</option><option value="volatile">Volatile</option></select></Field><Field label="Biggest current problem"><textarea required value={data.biggestProblem} onChange={e => update("biggestProblem", e.target.value)} placeholder="What is keeping you awake at night?" /></Field><Field label="Immediate business goal"><textarea required value={data.immediateGoal} onChange={e => update("immediateGoal", e.target.value)} placeholder="What must improve first?" /></Field><fieldset><legend>Urgent legal, payroll, tax, debt, or closure concerns</legend><p>Select every concern that applies.</p><div className="checks">{concerns.map(([value,label]) => <label key={value}><input type="checkbox" checked={data.urgentConcerns.includes(value)} onChange={e => { let next = e.target.checked ? [...data.urgentConcerns.filter(x => value === "none" ? false : x !== "none"), value] : data.urgentConcerns.filter(x => x !== value); if (value !== "none" && e.target.checked) next = next.filter(x => x !== "none"); update("urgentConcerns", next); }} /><span>{label}</span></label>)}</div></fieldset></div>}{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions">{step > 0 && <button type="button" className="button ghost" disabled={analysing} onClick={() => { setError(""); setStep(s => s - 1); }}>← Back</button>}<button type={step === 2 ? "submit" : "button"} className="button primary" disabled={analysing} onClick={step === 2 ? undefined : nextStep}>{analysing ? "Analysing your business…" : step === 2 ? "Build My Rescue Plan" : "Continue"} <span>→</span></button></div></form><p className="form-disclaimer">Your figures are used to generate this report. Business Lifeline does not replace professional accounting, legal, financial, or insolvency advice.</p></main>;
}
