"use client";

import { demoBusinesses } from "@/lib/demo";
import { generateReport } from "@/lib/planner";
import { useState } from "react";

const demoReports = demoBusinesses.map((business) => generateReport(business));

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
  onDemo: (demoIndex?: number) => void;
  demoLoading: boolean;
}) {
  const [demoChooserOpen, setDemoChooserOpen] = useState(false);
  const chooseDemo = (index: number) => { setDemoChooserOpen(false); onDemo(index); };
  return (
    <main id="main-content" className="judge-landing">
      {demoChooserOpen && <div className="demo-chooser-backdrop" role="presentation" onClick={() => setDemoChooserOpen(false)}>
        <section className="demo-chooser" role="dialog" aria-modal="true" aria-labelledby="demo-chooser-title" onClick={(event) => event.stopPropagation()}>
          <header><div><p className="eyebrow">DEMO MRI TEST LAB</p><h2 id="demo-chooser-title">Choose the business you want to test</h2><p>Each option loads a different financial position through the full Business Lifeline workspace.</p></div><button type="button" className="demo-chooser-close" aria-label="Close demo chooser" onClick={() => setDemoChooserOpen(false)}>×</button></header>
          <div className="demo-chooser-options">{demoBusinesses.map((business, index) => <button type="button" key={business.businessName} onClick={() => chooseDemo(index)}><small>{index === 0 ? "SMALL · DISTRESSED" : index === 1 ? "MEDIUM · COMPLEX" : "LARGE · SUCCESSFUL"}</small><strong>{business.businessName}</strong><span>{index === 0 ? "Test recovery, arrears and cash crisis" : index === 1 ? "Test projects, payroll and working capital" : "Test profitable growth and scale"}</span><b>{money(business.monthlyRevenue)}/month · {business.employees} staff</b><em>Open this Demo MRI →</em></button>)}</div>
        </section>
      </div>}
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
            <button type="button" className="button outline large judge-demo-button" onClick={() => setDemoChooserOpen(true)} disabled={demoLoading}>{demoLoading ? "Preparing demo…" : "Choose a Demo MRI"}</button>
          </div>
          <div className="judge-proof-row" aria-label="Product principles">
            <span><b>Deterministic figures</b><small>Scores and cashflow are calculated by tested rules.</small></span>
            <span><b>GPT-5.6 interpretation</b><small>AI explains causes, priorities and trade-offs.</small></span>
            <span><b>Safe escalation</b><small>Serious warning signs point to qualified help.</small></span>
          </div>
        </div>

        <div className="judge-demo-grid" aria-label="Business Lifeline demo businesses">{demoBusinesses.map((business, index) => { const report = demoReports[index]; const label = index === 0 ? "SMALL · DISTRESSED" : index === 1 ? "MEDIUM · COMPLEX" : "LARGE · SUCCESSFUL"; return <aside className="judge-demo-card" key={business.businessName}><header><span>{label}</span><b>{business.businessName}</b></header><div className="judge-demo-score"><span>Business health</span><strong>{report.metrics.overallScore}<small>/100</small></strong><p>{index === 0 ? "Recovery and distress test" : index === 1 ? "Working-capital complexity test" : "Profitable growth test"}</p></div><div className="judge-demo-metrics"><article><span>Monthly result</span><strong>{money(report.metrics.monthlyOperatingResult)}</strong></article><article><span>Cash available</span><strong>{money(business.cashAvailable)}</strong></article><article><span>Employees</span><strong>{business.employees}</strong></article><article><span>Monthly revenue</span><strong>{money(business.monthlyRevenue)}</strong></article></div><button type="button" onClick={() => chooseDemo(index)} disabled={demoLoading}><span><small>ONE-CLICK TEST BUSINESS</small>Open full workspace</span><b>→</b></button></aside>; })}</div>
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
        <h2>Open the workspace as a distressed small business, a complex medium business or a successful large business.</h2>
        <div className="judge-actions">{demoBusinesses.map((business, index) => <button key={business.businessName} type="button" className={index === 0 ? "button primary large" : "button outline large"} onClick={() => chooseDemo(index)} disabled={demoLoading}>{business.businessName} <span>→</span></button>)}</div>
      </section>

      <footer className="judge-footer">
        <a className="brand light" href="#main-content"><span>BL</span> Business Lifeline</a>
        <p>Decision support only. Not accounting, legal, financial or insolvency advice.</p>
      </footer>
    </main>
  );
}
