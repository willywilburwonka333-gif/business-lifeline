"use client";

import { PilotServiceSelection } from "@/components/pilot-service-selection";

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
    <PilotServiceSelection />

  </main>;
}
