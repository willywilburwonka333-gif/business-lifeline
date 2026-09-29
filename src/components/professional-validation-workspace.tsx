"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PROFESSIONAL_VALIDATION_KEY, readProfessionalValidation, validationMetrics, type AdviserFinding } from "@/lib/professional-validation";
import type { SavedReport } from "@/lib/saved-report";

const id = () => `validation-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function ProfessionalValidationWorkspace({ saved }: { saved: SavedReport }) {
  const [findings, setFindings] = useState<AdviserFinding[]>(() => readProfessionalValidation());
  const [draft, setDraft] = useState({
    adviserRole: "Accountant",
    area: "Overall diagnosis",
    lifelineFinding: saved.report.warnings[0] || saved.report.risks[0] || "No critical warning recorded.",
    adviserFinding: "",
    agreement: "not-reviewed" as AdviserFinding["agreement"],
    severityMatch: "not-applicable" as AdviserFinding["severityMatch"],
    notes: "",
  });
  const metrics = useMemo(() => validationMetrics(findings), [findings]);

  useEffect(() => {
    window.localStorage.setItem(PROFESSIONAL_VALIDATION_KEY, JSON.stringify(findings));
  }, [findings]);

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.adviserFinding.trim()) return;
    setFindings((current) => [{ id: id(), date: new Date().toISOString(), ...draft }, ...current]);
    setDraft((current) => ({ ...current, adviserFinding: "", notes: "", agreement: "not-reviewed", severityMatch: "not-applicable" }));
  };

  return <section className="workspace-section-stack">
    <header className="panel lifecycle-hero">
      <p className="eyebrow">VALIDATION</p>
      <h2>Compare Lifeline against qualified professional judgement</h2>
      <p>This workspace records agreement, disagreement, false alarms and possible missed-risk signals without pretending that automated output is professionally validated before the evidence exists.</p>
    </header>

    <section className="metric-grid">
      <article><span>Reviewed comparisons</span><strong>{metrics.reviewed}</strong></article>
      <article><span>Weighted agreement</span><strong>{metrics.agreementRate}%</strong></article>
      <article><span>Possible false alarms</span><strong>{metrics.falseAlarmSignals}</strong></article>
      <article><span>Possible missed-risk signals</span><strong>{metrics.missedRiskSignals}</strong></article>
    </section>

    <section className="panel">
      <form onSubmit={add} className="fields">
        <div className="two-cols">
          <label className="field"><span>Professional role</span><input value={draft.adviserRole} onChange={(e) => setDraft({ ...draft, adviserRole: e.target.value })} /></label>
          <label className="field"><span>Area reviewed</span><input value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} /></label>
        </div>
        <label className="field"><span>Lifeline finding</span><textarea value={draft.lifelineFinding} onChange={(e) => setDraft({ ...draft, lifelineFinding: e.target.value })} /></label>
        <label className="field"><span>Professional finding</span><textarea value={draft.adviserFinding} onChange={(e) => setDraft({ ...draft, adviserFinding: e.target.value })} placeholder="Record the professional's conclusion in your own words or with their permission." /></label>
        <div className="two-cols">
          <label className="field"><span>Agreement</span><select value={draft.agreement} onChange={(e) => setDraft({ ...draft, agreement: e.target.value as AdviserFinding["agreement"] })}><option value="not-reviewed">Not classified</option><option value="agree">Agree</option><option value="partial">Partly agree</option><option value="disagree">Disagree</option></select></label>
          <label className="field"><span>Risk severity comparison</span><select value={draft.severityMatch} onChange={(e) => setDraft({ ...draft, severityMatch: e.target.value as AdviserFinding["severityMatch"] })}><option value="not-applicable">Not applicable</option><option value="same">Same severity</option><option value="lifeline-higher">Lifeline rated higher</option><option value="adviser-higher">Professional rated higher</option></select></label>
        </div>
        <label className="field"><span>Notes / reason for difference</span><textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></label>
        <button className="button primary">Save comparison</button>
      </form>
    </section>

    <section className="panel">
      <div className="section-heading"><span>Evidence base</span><h3>Professional comparison log</h3></div>
      {!findings.length ? <p>No professional comparisons have been recorded yet.</p> : <div className="item-list">{findings.map((item) => <article key={item.id}><div><strong>{item.area} · {item.adviserRole}</strong><span>{new Date(item.date).toLocaleDateString("en-AU")} · {item.agreement} · {item.severityMatch}</span></div><p><b>Lifeline:</b> {item.lifelineFinding}</p><p><b>Professional:</b> {item.adviserFinding}</p>{item.notes && <small>{item.notes}</small>}</article>)}</div>}
    </section>
  </section>;
}
