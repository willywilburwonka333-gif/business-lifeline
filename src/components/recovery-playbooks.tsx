"use client";

import { useMemo, useState } from "react";
import { selectPlaybook } from "@/lib/recovery-playbooks";
import type { SavedReport } from "@/lib/saved-report";

export function RecoveryPlaybooks({ saved }: { saved: SavedReport }) {
  const recommended = useMemo(() => selectPlaybook(saved.data, saved.report), [saved]);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const done = recommended.steps.filter((_, index) => completed[`${recommended.id}-${index}`]).length;
  const progress = Math.round((done / recommended.steps.length) * 100);

  return (
    <section className="recovery-playbooks no-print">
      <div className="section-heading">
        <span>Recovery playbooks</span>
        <h3>{recommended.name}</h3>
      </div>

      <div className="playbook-hero">
        <div>
          <p className="playbook-severity">{recommended.severity} pathway</p>
          <p>{recommended.summary}</p>
          <small>{recommended.reason}</small>
        </div>
        <div className="playbook-progress" aria-label={`${progress}% complete`}>
          <strong>{progress}%</strong>
          <span>{done} of {recommended.steps.length} steps</span>
        </div>
      </div>

      <div className="playbook-grid">
        <div className="playbook-steps">
          {recommended.steps.map((step, index) => {
            const key = `${recommended.id}-${index}`;
            return (
              <article className={completed[key] ? "complete" : ""} key={key}>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(completed[key])}
                    onChange={(event) => setCompleted((current) => ({ ...current, [key]: event.target.checked }))}
                  />
                  <span>{step.timeframe}</span>
                </label>
                <div>
                  <h4>{step.title}</h4>
                  <p>{step.action}</p>
                  <small><b>Why:</b> {step.evidence}</small>
                  {step.professional && <small><b>Consider:</b> {step.professional}</small>}
                </div>
              </article>
            );
          })}
        </div>

        <aside className="playbook-measures">
          <span>Success measures</span>
          <h4>How to know this pathway is working</h4>
          {recommended.successMeasures.map((measure) => <p key={measure}>✓ {measure}</p>)}
          <div>
            <b>Important</b>
            <p>This playbook is decision support. Legal, tax, employment, finance and insolvency decisions should be checked by a qualified professional.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
