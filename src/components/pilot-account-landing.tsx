"use client";

import { DIAGNOSTIC_OFFERS } from "@/lib/diagnostic-offers";

export function PilotAccountLanding({ onStart, onDemo, demoLoading }: { onStart: () => void; onDemo: (index?: number) => void; demoLoading: boolean }) {
  return <main id="main-content" className="judge-landing">
    <section className="judge-hero"><div className="judge-hero-copy">
      <p className="judge-pill">Your approved pilot workspace</p>
      <h1>Your Business MRI.<br/><em>Your recovery roadmap.</em></h1>
      <p className="judge-lead">Complete the assessment with Dylan by phone or video call, then explore the supported diagnosis and recovery tools. Advanced operating, growth and sale modules remain unavailable until you receive separate approval.</p>
      <div className="judge-actions">
        <button type="button" className="button primary large" onClick={onStart}>Start my Business MRI →</button>
        <button type="button" className="button outline large" onClick={() => onDemo(0)} disabled={demoLoading}>Try a fictional example</button>
      </div>
      <p>Use estimates only when clearly labelled. Do not upload personal identifiers, bank passwords, tax file numbers or customer records. High-risk accounting, tax and insolvency matters require qualified advice.</p>
    </div></section>
    <section className="judge-story"><div className="judge-story-heading"><p>Discuss your pilot service</p><h2>Five diagnostic and repair options</h2><span>Indicative one-off service fees; selecting a level here does not purchase or unlock a plan. Scope and pricing must be agreed before any paid work.</span></div>
      <div className="judge-story-grid">
        {DIAGNOSTIC_OFFERS.map(offer => <article key={offer.name}><b>A${offer.price}</b><h3>{offer.name}</h3><p>{offer.for}</p><p>{offer.includes.join(" · ")}</p><a href={`mailto:dylan@businesslifeline.com.au?subject=${encodeURIComponent("Guided pilot: " + offer.name)}`}>Discuss this option →</a></article>)}
      </div>
    </section>
  </main>;
}
