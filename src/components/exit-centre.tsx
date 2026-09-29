"use client";

import { useEffect, useMemo, useState } from "react";
import { EXIT_PLAN_KEY, buildExitAnalysis, dataRoomLabels, readExitPlan, readinessLabels, type ExitPath, type ExitPlan, type ReadinessKey } from "@/lib/exit-readiness";
import type { SavedReport } from "@/lib/saved-report";

const money = (value: number) => value.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

export function ExitCentre({ saved }: { saved: SavedReport }) {
  const [plan, setPlan] = useState<ExitPlan>(() => readExitPlan());
  const analysis = useMemo(() => buildExitAnalysis(saved, plan), [saved, plan]);

  useEffect(() => {
    window.localStorage.setItem(EXIT_PLAN_KEY, JSON.stringify(plan));
  }, [plan]);

  const setReadiness = (key: ReadinessKey, value: 0 | 1 | 2) => setPlan((current) => ({ ...current, readiness: { ...current.readiness, [key]: value } }));
  const setDataRoom = (key: string, value: boolean) => setPlan((current) => ({ ...current, dataRoom: { ...current.dataRoom, [key]: value } }));

  return <section className="workspace-section-stack lifecycle-centre">
    <header className="panel lifecycle-hero">
      <p className="eyebrow">SELL / SUCCESSION</p>
      <h2>Build a transferable business before you need to exit it</h2>
      <p>Use current MRI and operating evidence to reduce buyer risk, prepare due diligence and plan a sale, succession, buyout or orderly closure.</p>
    </header>

    <section className="metric-grid">
      <article><span>Exit readiness</span><strong>{analysis.readinessScore}%</strong><small>Transferability and risk preparation</small></article>
      <article><span>Data room readiness</span><strong>{analysis.dataRoomScore}%</strong><small>Buyer / adviser records organised</small></article>
      <article><span>Maintainable earnings used</span><strong>{money(analysis.earnings)}</strong><small>Planning input, not a formal valuation</small></article>
      <article><span>Indicative scenario range</span><strong>{money(analysis.lowIndicative)} – {money(analysis.highIndicative)}</strong><small>User-selected multiples only</small></article>
    </section>

    <section className="panel">
      <div className="section-heading"><span>Exit direction</span><h3>Choose the path and target</h3></div>
      <div className="fields">
        <label className="field"><span>Preferred path</span><select value={plan.path} onChange={(e) => setPlan({ ...plan, path: e.target.value as ExitPath })}><option value="undecided">Undecided</option><option value="third-party-sale">Third-party sale</option><option value="management-buyout">Management buyout</option><option value="family-succession">Family succession</option><option value="partner-buyout">Partner buyout</option><option value="orderly-closure">Orderly closure</option></select></label>
        <label className="field"><span>Target exit / transition date</span><input type="date" value={plan.targetDate} onChange={(e) => setPlan({ ...plan, targetDate: e.target.value })} /></label>
        <label className="field"><span>Desired proceeds</span><input type="number" min="0" value={plan.desiredProceeds || ""} onChange={(e) => setPlan({ ...plan, desiredProceeds: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Owner hours per week</span><input type="number" min="0" value={plan.ownerHoursPerWeek} onChange={(e) => setPlan({ ...plan, ownerHoursPerWeek: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Recurring / repeat revenue %</span><input type="number" min="0" max="100" value={plan.recurringRevenuePercent} onChange={(e) => setPlan({ ...plan, recurringRevenuePercent: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Largest customer % of revenue</span><input type="number" min="0" max="100" value={plan.largestCustomerPercent} onChange={(e) => setPlan({ ...plan, largestCustomerPercent: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Tasks only the owner can currently do</span><textarea value={plan.ownerCriticalTasks} onChange={(e) => setPlan({ ...plan, ownerCriticalTasks: e.target.value })} placeholder="Sales relationships, quoting, approvals, technical knowledge, supplier relationships…" /></label>
      </div>
    </section>

    <section className="panel">
      <div className="section-heading"><span>Transferability</span><h3>Exit-readiness scorecard</h3></div>
      <p className="template-note">Score each item 0 = not ready, 1 = partly ready, 2 = buyer-ready. This is a preparation score, not a valuation or legal due-diligence opinion.</p>
      <div className="item-list">
        {(Object.entries(readinessLabels) as Array<[ReadinessKey, string]>).map(([key, label]) => <article key={key}>
          <div><strong>{label}</strong><span>{plan.readiness[key] === 0 ? "Needs work" : plan.readiness[key] === 1 ? "Partly ready" : "Ready"}</span></div>
          <div className="choice-row">
            <button type="button" className={plan.readiness[key] === 0 ? "active" : ""} onClick={() => setReadiness(key, 0)}>0</button>
            <button type="button" className={plan.readiness[key] === 1 ? "active" : ""} onClick={() => setReadiness(key, 1)}>1</button>
            <button type="button" className={plan.readiness[key] === 2 ? "active" : ""} onClick={() => setReadiness(key, 2)}>2</button>
          </div>
        </article>)}
      </div>
    </section>

    <div className="insight-grid">
      <section className="panel"><p className="eyebrow">Priority de-risking</p><h3>Fix these first</h3><ol>{analysis.priorities.map((item) => <li key={item}>{item}</li>)}</ol></section>
      <section className="panel"><p className="eyebrow">Buyer / transition risks</p><h3>Current watch-outs</h3><ul>{analysis.risks.map((item) => <li key={item}>{item}</li>)}</ul></section>
    </div>

    <section className="panel">
      <div className="section-heading"><span>Planning scenario</span><h3>Indicative earnings-multiple scenario</h3></div>
      <aside className="urgent"><b>Not a business valuation</b><p>This calculator only multiplies the maintainable earnings figure and multiples you enter. A qualified valuer/accountant should determine maintainable earnings, normalisations, working-capital treatment and appropriate market methodology.</p></aside>
      <div className="fields money-fields">
        <label className="field"><span>Maintainable annual earnings</span><input type="number" min="0" value={plan.maintainableAnnualEarnings || ""} onChange={(e) => setPlan({ ...plan, maintainableAnnualEarnings: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Low multiple</span><input type="number" min="0" step="0.1" value={plan.lowMultiple} onChange={(e) => setPlan({ ...plan, lowMultiple: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>High multiple</span><input type="number" min="0" step="0.1" value={plan.highMultiple} onChange={(e) => setPlan({ ...plan, highMultiple: Number(e.target.value) || 0 })} /></label>
      </div>
      {plan.desiredProceeds > 0 && <p className="scenario-save-status">{analysis.gapToDesired > 0 ? `The top of this scenario is ${money(analysis.gapToDesired)} below the desired proceeds. Improve maintainable earnings, reduce buyer risk or revisit assumptions.` : "The desired proceeds sit within or below this user-entered planning range."}</p>}
    </section>

    <section className="panel">
      <div className="section-heading"><span>Due diligence</span><h3>Living data-room checklist</h3></div>
      <p className="template-note">Build this while operating the business so an exit does not start with months of document hunting.</p>
      <div className="checks">
        {Object.entries(dataRoomLabels).map(([key, label]) => <label key={key}><input type="checkbox" checked={Boolean(plan.dataRoom[key])} onChange={(e) => setDataRoom(key, e.target.checked)} /><span>{label}</span></label>)}
      </div>
    </section>

    <section className="panel">
      <div className="section-heading"><span>Transition</span><h3>Handover notes</h3></div>
      <label className="field"><span>What must a buyer / successor understand?</span><textarea value={plan.notes} onChange={(e) => setPlan({ ...plan, notes: e.target.value })} placeholder="Key relationships, seasonal patterns, undocumented knowledge, major opportunities, commitments and transition support." /></label>
    </section>
  </section>;
}
