"use client";

import { demoBusiness } from "@/lib/demo";
import { generateReport } from "@/lib/planner";

const demoReport = generateReport(demoBusiness);

const money = (value: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);

export function JudgeLanding({
  onStart,
  onDemo,
  demoLoading,
}: {
  onStart: () => void;
  onDemo: () => void;
  demoLoading: boolean;
}) {
  return (
    <main id="main-content" className="judge-landing">
      <nav className="judge-nav" aria-label="Business Lifeline">
        <a className="brand light" href="#main-content"><span>BL</span> Business Lifeline</a>
        <button type="button" className="judge-nav-action" onClick={onStart}>Run the MRI <span>→</span></button>
      </nav>

      <section className="judge-hero">
        <div className="judge-hero-copy">
          <p className="judge-pill">AI-assisted small-business recovery operating system</p>
          <h1>Know what is wrong.<br/><em>Know what to do next.</em></h1>
          <p className="judge-lead">
            Business Lifeline combines tested financial calculations with GPT-5.6 interpretation to diagnose pressure, model recovery options and turn advice into an executable turnaround plan.
          </p>
          <div className="judge-actions">
            <button type="button" className="button primary large" onClick={onStart}>Run My Business MRI <span>→</span></button>
            <button type="button" className="button outline large judge-demo-button" onClick={onDemo} disabled={demoLoading}>
              {demoLoading ? "Preparing Riverbend Café…" : "Open Riverbend Café Demo"}
            </button>
          </div>
          <div className="judge-proof-row" aria-label="Product principles">
            <span><b>Deterministic figures</b><small>Scores and cashflow are calculated by tested rules.</small></span>
            <span><b>GPT-5.6 interpretation</b><small>AI explains causes, priorities and trade-offs.</small></span>
            <span><b>Safe escalation</b><small>Serious warning signs point to qualified help.</small></span>
          </div>
        </div>

        <aside className="judge-demo-card" aria-label="Riverbend Café example">
          <header><span>LIVE DEMO BUSINESS</span><b>Riverbend Café</b></header>
          <div className="judge-demo-score">
            <span>Business health</span>
            <strong>{demoReport.metrics.overallScore}<small>/100</small></strong>
            <p>Immediate recovery action recommended</p>
          </div>
          <div className="judge-demo-metrics">
            <article><span>Monthly result</span><strong>{money(demoReport.metrics.monthlyOperatingResult)}</strong></article>
            <article><span>Cash available</span><strong>{money(demoBusiness.cashAvailable)}</strong></article>
            <article><span>Overdue invoices</span><strong>{money(demoBusiness.overdueInvoices)}</strong></article>
            <article><span>Overdue obligations</span><strong>{money(demoBusiness.overdueTax + demoBusiness.overdueSuppliers)}</strong></article>
          </div>
          <button type="button" onClick={onDemo} disabled={demoLoading}>
            <span><small>ONE-CLICK WALKTHROUGH</small>See diagnosis, simulation and recovery system</span><b>→</b>
          </button>
        </aside>
      </section>

      <section className="judge-story" aria-label="How Business Lifeline works">
        <div className="judge-story-heading">
          <p>One connected recovery journey</p>
          <h2>From uncertainty to controlled action.</h2>
          <span>The product does not stop at a report. It carries the owner from diagnosis through execution.</span>
        </div>
        <div className="judge-story-grid">
          <article><b>01</b><h3>Diagnose</h3><p>Turn revenue, costs, cash, debt and overdue obligations into a clear Business MRI.</p></article>
          <article><b>02</b><h3>Prioritise</h3><p>Use GPT-5.6 to interpret the context, explain root causes and order the next moves.</p></article>
          <article><b>03</b><h3>Simulate</h3><p>Test price, sales, costs, collections and repayment changes before acting.</p></article>
          <article><b>04</b><h3>Execute</h3><p>Move the chosen recovery into playbooks, weekly coaching and the Business OS.</p></article>
        </div>
      </section>

      <section className="judge-trust">
        <div><p>Built for high-stakes clarity</p><h2>Useful without pretending to replace a professional.</h2></div>
        <ul>
          <li>Core financial calculations remain available if AI is unavailable.</li>
          <li>GPT output is constrained to a strict structured schema.</li>
          <li>The system does not make legal insolvency or tax conclusions.</li>
          <li>Reports stay in the user&apos;s browser in this prototype.</li>
        </ul>
      </section>

      <section className="judge-final-cta">
        <p>See the complete product in under a minute.</p>
        <h2>Open the recovery workspace with a realistic struggling business.</h2>
        <button type="button" className="button primary large" onClick={onDemo} disabled={demoLoading}>
          {demoLoading ? "Preparing demo…" : "Launch Riverbend Café Demo"} <span>→</span>
        </button>
      </section>

      <footer className="judge-footer">
        <a className="brand light" href="#main-content"><span>BL</span> Business Lifeline</a>
        <p>Decision support only. Not accounting, legal, financial or insolvency advice.</p>
      </footer>
    </main>
  );
}
