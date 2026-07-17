"use client";

import { useEffect, useState } from "react";
import { demoBusiness, emptyBusiness } from "@/lib/demo";
import { generateReport } from "@/lib/planner";
import type { BusinessData, BusinessReport, PlanAction } from "@/lib/types";

const STORAGE_KEY = "business-lifeline-mri-v1";
const money = (n: number) => new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const numberFields: { key: keyof BusinessData; label: string; help?: string }[] = [
  { key: "monthlyRevenue", label: "Monthly revenue" }, { key: "fixedExpenses", label: "Fixed expenses" },
  { key: "variableExpenses", label: "Variable expenses" }, { key: "ownerDrawings", label: "Owner drawings" },
  { key: "loanRepayments", label: "Loan repayments" }, { key: "cashAvailable", label: "Cash available" },
  { key: "accountsReceivable", label: "Accounts receivable", help: "All money currently owed by customers." },
  { key: "overdueInvoices", label: "Overdue customer invoices" }, { key: "totalDebt", label: "Total business debt" },
  { key: "overdueTax", label: "Overdue tax" }, { key: "overdueSuppliers", label: "Overdue supplier bills" },
];
const concerns = [
  ["payroll", "Unable to pay staff"], ["tax", "Serious overdue tax"], ["legal", "Legal demands"],
  ["debts", "Unable to pay debts as they fall due"], ["closure", "Imminent closure risk"], ["none", "None of these"],
];

function Field({ label, children, help }: { label: string; children: React.ReactNode; help?: string }) {
  return <label className="field"><span>{label}</span>{children}{help && <small>{help}</small>}</label>;
}

function Actions({ title, eyebrow, actions }: { title: string; eyebrow: string; actions: PlanAction[] }) {
  return <section className="plan-section"><div className="section-heading"><span>{eyebrow}</span><h3>{title}</h3></div><div className="action-grid">{actions.map((item) =>
    <article className="action-card" key={item.title}><div className="action-top"><strong>{item.title}</strong><span className={`tag ${item.urgency.toLowerCase()}`}>{item.urgency}</span></div><p>{item.reason}</p><div className="meta"><span>Impact <b>{item.impact}</b></span><span>Difficulty <b>{item.difficulty}</b></span></div></article>
  )}</div></section>;
}

function ReportView({ data, report, onReset }: { data: BusinessData; report: BusinessReport; onReset: () => void }) {
  const { metrics: m } = report;
  const scoreTone = m.overallScore >= 70 ? "good" : m.overallScore >= 45 ? "watch" : "danger";
  return <main className="report-shell">
    <header className="report-header no-print"><a className="brand" href="#top"><span>BL</span> Business Lifeline</a><div><button className="button ghost" onClick={onReset}>Start Again</button><button className="button primary" onClick={() => window.print()}>Print Report</button></div></header>
    <div className="report-title"><div><p className="eyebrow">Business MRI report</p><h1>{data.businessName}</h1><p>{data.industry} · {data.country}</p></div><p className="report-date">Prepared {new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date())}</p></div>
    {report.urgentHelp && <aside className="urgent" role="alert"><b>Urgent professional help recommended</b><p>Your answers indicate serious tax, payroll, legal, debt, or closure risk. Contact a qualified accountant, lawyer, turnaround adviser, or licensed insolvency professional now. If staff are affected, communicate promptly and follow local employment law.</p></aside>}
    <section className="score-hero"><div className={`score-ring ${scoreTone}`}><strong>{m.overallScore}</strong><span>/ 100</span></div><div><p className="eyebrow">Overall business health</p><h2>{m.overallScore >= 70 ? "Stable, with room to strengthen" : m.overallScore >= 45 ? "Under pressure — act now" : "Critical — immediate action needed"}</h2><p>This score combines cash flow, runway, debt pressure, and revenue stability. It is a decision-support indicator, not a valuation or insolvency assessment.</p></div></section>
    <section className="metric-grid"><article><span>Monthly result</span><strong className={m.monthlyOperatingResult < 0 ? "negative" : "positive"}>{money(m.monthlyOperatingResult)}</strong><small>{m.operatingMargin}% operating margin</small></article><article><span>Cash runway</span><strong>{m.runwayMonths === null ? "Cash positive" : `${m.runwayMonths} months`}</strong><small>At the current monthly result</small></article><article><span>Expense ratio</span><strong>{m.expenseRatio}%</strong><small>Of monthly revenue</small></article><article><span>Debt pressure</span><strong>{m.debtPressure}%</strong><small>Of annualised revenue</small></article></section>
    <section className="insight-grid"><article className="panel"><p className="eyebrow">Main warnings</p><h3>What needs attention</h3><ul>{report.warnings.length ? report.warnings.map(x => <li key={x}>{x}</li>) : <li>No critical operating warnings detected.</li>}</ul></article><article className="panel"><p className="eyebrow">Strongest areas</p><h3>What you can build on</h3><ul className="strengths">{report.strengths.map(x => <li key={x}>{x}</li>)}</ul></article></section>
    <section className="risk-panel"><p className="eyebrow">Priority risks</p><h2>Top three risks</h2><div>{report.risks.length ? report.risks.map((x, i) => <article key={x}><span>0{i + 1}</span><p>{x}</p></article>) : <p>No major risks identified by the current rules.</p>}</div></section>
    <Actions title="Stop the immediate pressure" eyebrow="Actions for today" actions={report.today} />
    <Actions title="Stabilise cash and commitments" eyebrow="Seven-day plan" actions={report.sevenDays} />
    <Actions title="Repair the operating model" eyebrow="Thirty-day plan" actions={report.thirtyDays} />
    <Actions title="Build a more resilient business" eyebrow="Ninety-day plan" actions={report.ninetyDays} />
    <footer className="disclaimer">Business Lifeline provides decision-support information and does not replace professional accounting, legal, financial, or insolvency advice.</footer>
  </main>;
}

export function BusinessLifeline() {
  const [view, setView] = useState<"landing" | "form" | "report">("landing");
  const [step, setStep] = useState(0);
  const [data, setData] = useState<BusinessData>(emptyBusiness);
  const [report, setReport] = useState<BusinessReport | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const value = JSON.parse(saved);
          setData(value.data);
          setReport(value.report);
          setView("report");
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const update = (key: keyof BusinessData, value: string | number | string[]) => setData(d => ({ ...d, [key]: value }));
  const useDemo = () => { const next = generateReport(demoBusiness); setData(demoBusiness); setReport(next); localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: demoBusiness, report: next })); setView("report"); window.scrollTo(0, 0); };
  const reset = () => { localStorage.removeItem(STORAGE_KEY); setData(emptyBusiness); setReport(null); setStep(0); setView("landing"); window.scrollTo(0, 0); };
  const nextStep = () => {
    const required = step === 0 ? [data.businessName, data.industry, data.country] : step === 2 ? [data.biggestProblem, data.immediateGoal] : ["ok"];
    if (required.some(x => !String(x).trim())) { setError("Please complete every required field before continuing."); return; }
    setError(""); setStep(s => Math.min(2, s + 1)); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!data.biggestProblem.trim() || !data.immediateGoal.trim()) { setError("Tell us your biggest problem and immediate goal to build the plan."); return; } const next = generateReport(data); setReport(next); localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, report: next })); setView("report"); window.scrollTo(0, 0); };

  if (!loaded) return <main className="loading" aria-label="Loading Business Lifeline" />;
  if (view === "report" && report) return <ReportView data={data} report={report} onReset={reset} />;
  if (view === "landing") return <main id="top" className="landing">
    <nav><a className="brand light" href="#top"><span>BL</span> Business Lifeline</a><button className="nav-link" onClick={() => setView("form")}>Start your MRI <span>→</span></button></nav>
    <section className="hero"><div className="hero-copy"><p className="pill">A clear plan when business feels uncertain</p><h1>Business<br/><em>Lifeline.</em></h1><p className="subheading">Find what is hurting your business. Know exactly what to do next.</p><div className="hero-actions"><button className="button primary large" onClick={() => setView("form")}>Run My Business MRI <span>→</span></button><button className="button outline large" onClick={useDemo}>Try Demo Business</button></div><p className="privacy">Private by design · Your data stays in this browser</p></div><div className="hero-card"><div className="mini-head"><span>BUSINESS MRI</span><span>RIVERBEND CAFÉ</span></div><div className="mini-score"><span>Health score</span><strong>42<small>/100</small></strong><div><i style={{ width: "42%" }}/></div><p>Immediate action recommended</p></div><div className="mini-stats"><span><small>MONTHLY RESULT</small><b>−$1,500</b></span><span><small>CASH RUNWAY</small><b>9.3 mo</b></span></div><div className="mini-action"><b>01</b><span><small>DO THIS TODAY</small>Collect overdue invoices</span><i>→</i></div></div></section>
    <section className="steps"><div><p className="eyebrow">Your path forward</p><h2>Clarity in three steps.</h2></div>{[["01","Diagnose the problem","See the numbers behind the pressure — without jargon or guesswork."],["02","Prioritise urgent actions","Separate what needs attention today from what can wait."],["03","Build a rescue plan","Leave with practical actions for the next 90 days."]].map(x => <article key={x[0]}><span>{x[0]}</span><div className="step-icon">{x[0] === "01" ? "⌁" : x[0] === "02" ? "!" : "✓"}</div><h3>{x[1]}</h3><p>{x[2]}</p></article>)}</section>
    <section className="closing"><p className="eyebrow">Take the first step</p><h2>Your business can feel<br/>manageable again.</h2><button className="button primary large" onClick={() => setView("form")}>Start your free Business MRI <span>→</span></button></section>
    <footer className="landing-footer"><a className="brand light" href="#top"><span>BL</span> Business Lifeline</a><p>Business Lifeline provides decision-support information and does not replace professional accounting, legal, financial, or insolvency advice.</p></footer>
  </main>;

  return <main className="form-shell"><header className="form-header"><button className="brand button-reset" onClick={() => setView("landing")}><span>BL</span> Business Lifeline</button><small>Business MRI · Step {step + 1} of 3</small></header><div className="progress"><i style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
    <form onSubmit={submit} noValidate><div className="form-intro"><p className="eyebrow">{step === 0 ? "Your business" : step === 1 ? "The numbers" : "Pressure & priorities"}</p><h1>{step === 0 ? "Let’s get the basics." : step === 1 ? "How is cash moving?" : "What needs attention?"}</h1><p>{step === 0 ? "This helps us put your numbers in context." : step === 1 ? "Use a typical recent month. Estimates are fine — honest is more useful than perfect." : "Your context helps turn the diagnosis into a practical rescue plan."}</p></div>
      {step === 0 && <div className="fields"><Field label="Business name"><input required value={data.businessName} onChange={e => update("businessName", e.target.value)} placeholder="e.g. Riverbend Café" /></Field><Field label="Industry"><input required value={data.industry} onChange={e => update("industry", e.target.value)} placeholder="e.g. Café and hospitality" /></Field><Field label="Country"><input required value={data.country} onChange={e => update("country", e.target.value)} placeholder="Where is the business based?" /></Field><div className="two-cols"><Field label="Years operating"><input type="number" min="0" required value={data.yearsOperating} onChange={e => update("yearsOperating", Number(e.target.value))} /></Field><Field label="Number of employees"><input type="number" min="0" required value={data.employees} onChange={e => update("employees", Number(e.target.value))} /></Field></div></div>}
      {step === 1 && <div className="fields money-fields">{numberFields.map(f => <Field key={String(f.key)} label={f.label} help={f.help}><div className="money-input"><span>$</span><input type="number" min="0" step="any" required aria-label={`${f.label} amount`} value={data[f.key] as number} onChange={e => update(f.key, Number(e.target.value))} /></div></Field>)}</div>}
      {step === 2 && <div className="fields"><Field label="Revenue trend"><select value={data.revenueTrend} onChange={e => update("revenueTrend", e.target.value)}><option value="growing">Growing</option><option value="stable">Stable</option><option value="declining">Declining</option><option value="volatile">Volatile</option></select></Field><Field label="Biggest current problem"><textarea required value={data.biggestProblem} onChange={e => update("biggestProblem", e.target.value)} placeholder="What is keeping you awake at night?" /></Field><Field label="Immediate business goal"><textarea required value={data.immediateGoal} onChange={e => update("immediateGoal", e.target.value)} placeholder="What must improve first?" /></Field><fieldset><legend>Urgent legal, payroll, tax, debt, or closure concerns</legend><p>Select every concern that applies.</p><div className="checks">{concerns.map(([value,label]) => <label key={value}><input type="checkbox" checked={data.urgentConcerns.includes(value)} onChange={e => { let next = e.target.checked ? [...data.urgentConcerns.filter(x => value === "none" ? false : x !== "none"), value] : data.urgentConcerns.filter(x => x !== value); if (value !== "none" && e.target.checked) next = next.filter(x => x !== "none"); update("urgentConcerns", next); }} /><span>{label}</span></label>)}</div></fieldset></div>}
      {error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions">{step > 0 && <button type="button" className="button ghost" onClick={() => { setError(""); setStep(s => s - 1); }}>← Back</button>}<button type={step === 2 ? "submit" : "button"} className="button primary" onClick={step === 2 ? undefined : nextStep}>{step === 2 ? "See My Business MRI" : "Continue"} <span>→</span></button></div>
    </form><p className="form-disclaimer">Business Lifeline provides decision-support information and does not replace professional accounting, legal, financial, or insolvency advice.</p></main>;
}
