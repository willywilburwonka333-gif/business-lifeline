"use client";

import type { BusinessData, BusinessReport } from "@/lib/types";

const currencyFor = (country: string) => country.toLowerCase().includes("australia") ? "AUD" : "USD";
const money = (value: number, country: string) => new Intl.NumberFormat("en", { style: "currency", currency: currencyFor(country), maximumFractionDigits: 0 }).format(value);

export function TodayActionSheet({ data, report }: { data: BusinessData; report: BusinessReport }) {
  const m = report.metrics;
  const severity = report.urgentHelp ? "Immediate escalation" : m.overallScore < 45 ? "Critical" : m.overallScore < 70 ? "Under pressure" : "Stable";
  const overdue = data.overdueTax + data.overdueSuppliers + data.overdueInvoices;
  const actions = report.today.slice(0, 5);

  const printSheet = () => {
    document.body.classList.add("print-today-sheet");
    const cleanup = () => document.body.classList.remove("print-today-sheet");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1500);
  };

  return (
    <section className="today-sheet-wrap">
      <div className="today-sheet-toolbar no-print">
        <div><span>One-page rescue sheet</span><h3>Put today’s priorities where you can see them</h3></div>
        <button className="button primary" type="button" onClick={printSheet}>Print today’s actions</button>
      </div>

      <article className="today-action-sheet" aria-label="Today's rescue action sheet">
        <header>
          <div><p>BUSINESS LIFELINE</p><h1>{data.businessName}</h1><span>{data.industry} · {data.country}</span></div>
          <div className={`sheet-severity ${severity.toLowerCase().replaceAll(" ", "-")}`}><small>Crisis level</small><strong>{severity}</strong></div>
        </header>

        <section className="sheet-metrics">
          <div><small>Health score</small><strong>{m.overallScore}/100</strong></div>
          <div><small>Monthly result</small><strong>{money(m.monthlyOperatingResult, data.country)}</strong></div>
          <div><small>Cash runway</small><strong>{m.runwayMonths === null ? "Cash positive" : `${m.runwayMonths} months`}</strong></div>
          <div><small>Overdue pressure</small><strong>{money(overdue, data.country)}</strong></div>
        </section>

        <section className="sheet-actions">
          <p>TODAY’S RESCUE ACTIONS</p>
          {actions.map((action, index) => <div key={`${action.title}-${index}`}><span>☐</span><article><small>0{index + 1}</small><h2>{action.title}</h2><p>{action.reason}</p></article></div>)}
        </section>

        <section className="sheet-contacts">
          <div><small>People to contact today</small><p>Largest overdue customer · accountant or tax agent · critical supplier or lender</p></div>
          <div><small>Immediate goal</small><p>{data.immediateGoal || "Stabilise cash flow and protect essential operations."}</p></div>
          <div><small>Review date</small><p>{new Intl.DateTimeFormat("en-AU", { dateStyle: "long" }).format(new Date(Date.now() + 7 * 86400000))}</p></div>
        </section>

        {report.urgentHelp && <aside><strong>Professional help recommended today.</strong> Current answers indicate serious tax, payroll, legal, debt, or closure pressure. Contact a qualified accountant, lawyer, turnaround adviser, or licensed insolvency professional.</aside>}
        <footer>Decision-support only. This sheet does not replace accounting, legal, financial, employment, tax, or insolvency advice.</footer>
      </article>
    </section>
  );
}
