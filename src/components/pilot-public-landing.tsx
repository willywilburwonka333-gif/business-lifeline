"use client";

import { DIAGNOSTIC_OFFERS } from "@/lib/diagnostic-offers";

export function PilotPublicLanding() {
  const openAccount = () => window.dispatchEvent(new Event("business-lifeline-open-account"));
  return (
    <main id="main-content" className="judge-landing">
      <section className="judge-hero">
        <div className="judge-hero-copy">
          <p className="judge-pill">Business Lifeline · Guided pilot</p>
          <h1>Diagnose the pressure.<br/><em>Make a practical recovery plan.</em></h1>
          <p className="judge-lead">Business Lifeline helps Australian small-business owners understand financial pressure and identify possible operational improvements. Our pilot includes a guided Business MRI and Repair Centre, with results reviewed together.</p>
          <div className="judge-actions">
            <a className="button primary large" href="/demo">Try the interactive demo →</a>
            <a className="button outline large" href="mailto:businesslifelinesupport@gmail.com?subject=Business%20Lifeline%20pilot%20walkthrough">Message Dylan for help</a>
          </div>
          <p>No account, no payment, and no business records required. You can try a read-only demonstration first and contact Dylan if you want help with your own business.</p>
        </div>
        <div className="judge-demo-grid">
          <article className="judge-demo-card"><header><span>EXAMPLE ONLY · FICTIONAL</span><b>What your MRI can show</b></header><div className="judge-demo-metrics">
            <article><span>01</span><strong>Business pressures</strong></article>
            <article><span>02</span><strong>Missing evidence</strong></article>
            <article><span>03</span><strong>Recovery priorities</strong></article>
            <article><span>04</span><strong>7/30/90-day plan</strong></article>
          </div></article>
        </div>
      </section>
      <section className="judge-story">
        <div className="judge-story-heading"><p>How the guided pilot works</p><h2>One account. One review. Measurable next steps.</h2></div>
        <div className="judge-story-grid">
          <article><b>01</b><h3>Try the demo</h3><p>Explore three fictional business MRI examples on your own, with no registration.</p></article>
          <article><b>02</b><h3>Contact Dylan</h3><p>Message us if you want a guided review of your own business figures.</p></article>
          <article><b>03</b><h3>Agree on your review</h3><p>We discuss the scope, access and information needed before beginning any real-business work.</p></article>
          <article><b>04</b><h3>Get guided support</h3><p>Your private workspace is enabled only when Business Lifeline approves a pilot.</p></article>
        </div>
      </section>
      <section className="judge-story">
        <div className="judge-story-heading"><p>Guided service options</p><h2>Five levels of support to discuss.</h2><span>These are proposed service prices, not automatic subscription charges or verified outcomes.</span></div>
        <div className="judge-story-grid">
          {DIAGNOSTIC_OFFERS.map((offer) => <article key={offer.name}><b>A${offer.price}</b><h3>{offer.name}</h3><p>{offer.for}</p><p>{offer.includes.join(" · ")}</p></article>)}
        </div>
      </section>
      <section className="judge-final-cta"><h2>Want to see whether Business Lifeline can help?</h2><p>Start with a fictional demonstration; only supply real records after agreed scope, consent and security checks.</p><div className="judge-actions"><a className="button primary large" href="/demo">Explore the free demo →</a><button type="button" className="button outline large" onClick={openAccount}>Already invited? Sign in →</button></div></section>
    </main>
  );
}
