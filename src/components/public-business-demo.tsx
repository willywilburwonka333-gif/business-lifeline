"use client";

import { useMemo, useState } from "react";
import { demoBusinesses } from "@/lib/demo";
import { generateReport } from "@/lib/planner";

const fmt = (value: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(value);

const caseNotes = [
  "A small hospitality business with mounting cash pressure.",
  "A growing construction business balancing jobs and working capital.",
  "A larger services business investigating scalable operations.",
] as const;

type DemoTab = "diagnose" | "recover";
export function PublicBusinessDemo({ showBackLink = false }: { showBackLink?: boolean }) {
  const [example, setExample] = useState(0);
  const [tab, setTab] = useState<DemoTab>("diagnose");
  const data = demoBusinesses[example] ?? demoBusinesses[0];
  // Pure, deterministic calculations using the exact fictional samples used by the MRI.
  // This component never saves reports, accepts visitor financial data, or calls Firebase.
  const report = useMemo(() => generateReport(data), [data]);
  const { metrics } = report;
  const tasks = [
    { label: "Start here", period: report.today, key: "today" },
    { label: "Next 7 days", period: report.sevenDays, key: "seven" },
    { label: "Next 30 days", period: report.thirtyDays, key: "thirty" },
    { label: "Next 90 days", period: report.ninetyDays, key: "ninety" },
  ];
  const messageLink = "mailto:businesslifelinesupport@gmail.com?subject=" +
    encodeURIComponent("Business Lifeline — I tried your demo") +
    "&body=" + encodeURIComponent("G'day Dylan, I tried the Business Lifeline demo and would like to discuss how it might help my business.\n\nBusiness name: \nBest contact: \n");

  return <main id="public-demo" className="public-demo">
    <div className="public-demo-shell">
      <header className="public-demo-top">
        <a href="/" aria-label="Return to Business Lifeline home"><span className="public-demo-wordmark">BUSINESS <strong>LIFELINE</strong></span></a>
        <span className="public-demo-proof">LIVE PREVIEW <i aria-hidden="true" /> FICTIONAL DATA ONLY</span>
      </header>
      <section className="public-demo-hero">
        <span className="public-demo-kicker">FREE INTERACTIVE DEMONSTRATION</span>
        <h1>See what your business numbers <em>could tell you.</em></h1>
        <p>Choose one of three made-up businesses. Explore a real calculation-based Business MRI and sample recovery priorities — without registering, paying, or entering any of your own information.</p>
      </section>
      <section aria-labelledby="choose-demo-heading" className="public-demo-chooser">
        <div className="public-demo-section-title">
          <div><small>STEP 01 / PICK AN EXAMPLE</small><h2 id="choose-demo-heading">Explore a fictional business</h2></div>
          <span>3 examples</span>
        </div>
        <div className="public-demo-cases">
          {demoBusinesses.map((business, index) => <button key={business.businessName} type="button" aria-pressed={example === index}
              className={`public-demo-case ${example === index ? "selected" : ""}`}
              onClick={() => { setExample(index); setTab("diagnose"); }}>
            <span className="public-demo-case-index">0{index + 1} / {index === 0 ? "HOSPITALITY" : index === 1 ? "CONSTRUCTION" : "SERVICES"}</span>
            <strong>{business.businessName}</strong>
            <span>{caseNotes[index]}</span>
            <span className="public-demo-case-action">{example === index ? "Selected ✓" : "View this example →"}</span>
          </button>)}
        </div>
      </section>
      <section className="public-demo-result" aria-labelledby="demo-results-heading">
        <div className="public-demo-section-title">
          <div><small>STEP 02 / INVESTIGATE</small><h2 id="demo-results-heading">{data.businessName}</h2></div>
          <span className="public-demo-example-tag">EXAMPLE RESULTS</span>
        </div>
        <div className="public-demo-tabs" role="tablist" aria-label="Sample assessment sections">
          <button id="public-diagnose-tab" type="button" role="tab" aria-selected={tab === "diagnose"} aria-controls="public-demo-tab-content"
            className={tab === "diagnose" ? "active" : ""} onClick={() => setTab("diagnose")}>01 — Diagnose</button>
          <button id="public-recover-tab" type="button" role="tab" aria-selected={tab === "recover"} aria-controls="public-demo-tab-content"
            className={tab === "recover" ? "active" : ""} onClick={() => setTab("recover")}>02 — Recover</button>
        </div>
        <div id="public-demo-tab-content" role="tabpanel" aria-labelledby={tab === "diagnose" ? "public-diagnose-tab" : "public-recover-tab"}>
          {tab === "diagnose" ? <>
            <div className="public-demo-metrics">
              <div className="public-demo-score">
                <small>BUSINESS HEALTH INDICATOR</small><strong>{metrics.overallScore}<span>/100</span></strong>
                <div className="public-demo-track"><span style={{ width: `${metrics.overallScore}%` }} /></div>
                <p>{metrics.pressureLevel} pressure · Indicative result</p>
              </div>
              <div className="public-demo-metric"><small>DATA CONFIDENCE</small><strong>{metrics.dataConfidence}%</strong><p>How complete the example&apos;s data is, not a guarantee</p></div>
              <div className="public-demo-metric"><small>MONTHLY REVENUE</small><strong>{fmt(data.monthlyRevenue)}</strong><p>Synthetic sample only</p></div>
              <div className="public-demo-metric"><small>OPERATING SURPLUS ESTIMATE</small><strong>{fmt(metrics.operatingSurplusEstimate)}</strong><p>Revenue minus supplied operating costs</p></div>
            </div>
            <div className="public-demo-two-col">
              <article className="public-demo-detail"><h3>Areas worth investigating</h3>
                {report.warnings.length ? <ul>{report.warnings.slice(0,4).map((warning,i)=><li key={i}>{warning}</li>)}</ul> :
                  <p>There are no immediate automated warnings in the chosen fictional example.</p>}
              </article>
              <article className="public-demo-detail"><h3>What&apos;s working</h3>
                {report.strengths.length ? <ul>{report.strengths.slice(0,4).map((strength,i)=><li key={i}>{strength}</li>)}</ul> :
                  <p>Further supporting records would help establish strengths.</p>}
              </article>
            </div>
          </> : <>
            <p className="public-demo-explainer">From the same fictional business figures, the system suggests practical priorities across four timeframes. These are prompts for review, not instructions to act without professional judgement.</p>
            <div className="public-demo-steps">{tasks.map(group=><article key={group.key}>
              <h3>{group.label}</h3>
              {group.period.length ? <ul>{group.period.slice(0,2).map((action,i)=><li key={i}><strong>{action.title}</strong><span>{action.reason}</span></li>)}</ul> :
                <p>No urgent action flagged for this timeframe in the fictional example.</p>}
            </article>)}</div>
          </>}
        </div>
        <div className="public-demo-result-footer">
          <span>Read-only showcase · No data entry · No live business records · No purchase</span>
          {tab === "diagnose" && <button className="public-demo-next" type="button" onClick={() => setTab("recover")}>See suggested recovery steps →</button>}
        </div>
      </section>
      <section className="public-demo-cta" aria-labelledby="public-demo-cta-heading">
        <div><span className="public-demo-kicker">STEP 03 / YOUR BUSINESS</span>
          <h2 id="public-demo-cta-heading">Want help with your own numbers?</h2>
          <p>You&apos;ve just seen what Business Lifeline can show. A real business review requires an agreed scope, verified information and a guided session with Dylan. Your own business details are not entered into this public demo.</p>
          <div className="public-demo-actions">
            <a className="public-demo-contact" href={messageLink}>Message Dylan about my business →</a>
            <a className="public-demo-secondary" href="https://businesslifeline.com.au/">Back to Business Lifeline</a>
          </div>
          <small>No obligation. Diagnostics are decision-support tools, not accounting, taxation or insolvency advice.</small>
        </div>
      </section>
      {showBackLink && <p className="public-demo-account-note">Account created? A business pilot is only unlocked after the owner approves access. You can explore this demonstration now and contact Dylan to arrange a guided review.</p>}
    </div>
  </main>;
}
