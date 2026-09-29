"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { GROWTH_PLAN_KEY, buildGrowthAnalysis, growthScenario, readGrowthPlan, readOperatingSnapshot, type GrowthInitiative, type GrowthPlan } from "@/lib/growth-engine";
import type { SavedReport } from "@/lib/saved-report";

const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const money = (value: number) => value.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

export function GrowthCentre({ saved }: { saved: SavedReport }) {
  const [plan, setPlan] = useState<GrowthPlan>(() => readGrowthPlan());
  const [operating, setOperating] = useState(() => readOperatingSnapshot());
  const [initiative, setInitiative] = useState({ name: "", hypothesis: "", cost: 0, expectedMonthlyRevenue: 0, expectedMonthlyGrossProfit: 0, owner: "", reviewDate: "" });
  const [scenario, setScenario] = useState({ priceChangePercent: 0, volumeChangePercent: 0, addedMonthlyFixedCost: 0, addedMonthlyPayroll: 0, addedMonthlyMarketing: 0 });
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setOperating(readOperatingSnapshot()), 1500);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    window.localStorage.setItem(GROWTH_PLAN_KEY, JSON.stringify(plan));
  }, [plan]);

  const analysis = useMemo(() => buildGrowthAnalysis(saved, plan, operating), [saved, plan, operating]);
  const scenarioResult = useMemo(() => growthScenario(saved, scenario), [saved, scenario]);

  const addInitiative = (event: FormEvent) => {
    event.preventDefault();
    if (!initiative.name.trim()) return;
    const next: GrowthInitiative = {
      id: id("growth"),
      ...initiative,
      name: initiative.name.trim(),
      hypothesis: initiative.hypothesis.trim(),
      actualMonthlyRevenue: 0,
      actualMonthlyGrossProfit: 0,
      status: "idea",
    };
    setPlan((current) => ({ ...current, initiatives: [next, ...current.initiatives] }));
    setInitiative({ name: "", hypothesis: "", cost: 0, expectedMonthlyRevenue: 0, expectedMonthlyGrossProfit: 0, owner: "", reviewDate: "" });
    setMessage("Growth experiment added.");
  };

  const updateInitiative = (initiativeId: string, patch: Partial<GrowthInitiative>) =>
    setPlan((current) => ({ ...current, initiatives: current.initiatives.map((item) => item.id === initiativeId ? { ...item, ...patch } : item) }));

  return <section className="workspace-section-stack lifecycle-centre">
    <header className="panel lifecycle-hero">
      <p className="eyebrow">GROW</p>
      <h2>Grow without rebuilding the same problems at a larger scale</h2>
      <p>Growth planning is grounded in the current MRI, margins, cash position, receivables, sales pipeline and operating workload.</p>
    </header>

    <section className="metric-grid">
      <article><span>Current annualised revenue</span><strong>{money(analysis.currentAnnualRevenue)}</strong><small>From the latest MRI</small></article>
      <article><span>Target annual revenue</span><strong>{money(analysis.targetAnnualRevenue)}</strong><small>{money(analysis.revenueGap)} growth gap</small></article>
      <article><span>Current margin</span><strong>{analysis.currentMargin}%</strong><small>Target {analysis.targetMargin}%</small></article>
      <article><span>Experiment coverage</span><strong>{analysis.targetCoveragePercent}%</strong><small>Of the monthly growth gap currently covered by active experiments</small></article>
    </section>

    <section className="panel">
      <div className="section-heading"><span>Growth destination</span><h3>Set the target before spending to chase it</h3></div>
      <div className="fields money-fields">
        <label className="field"><span>Annual revenue target</span><input type="number" min="0" value={plan.annualRevenueTarget || ""} onChange={(e) => setPlan({ ...plan, annualRevenueTarget: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Target operating margin %</span><input type="number" min="0" max="100" value={plan.targetOperatingMargin} onChange={(e) => setPlan({ ...plan, targetOperatingMargin: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Target monthly owner income</span><input type="number" min="0" value={plan.targetMonthlyOwnerIncome || ""} onChange={(e) => setPlan({ ...plan, targetMonthlyOwnerIncome: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Target cash buffer (months)</span><input type="number" min="0" step="0.5" value={plan.targetCashBufferMonths} onChange={(e) => setPlan({ ...plan, targetCashBufferMonths: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Target date</span><input type="date" value={plan.targetDate} onChange={(e) => setPlan({ ...plan, targetDate: e.target.value })} /></label>
        <label className="field"><span>Growth strategy</span><textarea value={plan.strategy} onChange={(e) => setPlan({ ...plan, strategy: e.target.value })} placeholder="Example: grow recurring service revenue without increasing owner hours." /></label>
      </div>
    </section>

    <div className="insight-grid">
      <section className="panel"><p className="eyebrow">Constraints</p><h3>What could break first</h3><ul>{analysis.constraints.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section className="panel"><p className="eyebrow">Opportunities</p><h3>Where to test first</h3><ul>{analysis.opportunities.map((item) => <li key={item}>{item}</li>)}</ul></section>
    </div>

    <section className="panel">
      <div className="section-heading"><span>Growth scenario</span><h3>Test the economics before committing</h3></div>
      <div className="fields money-fields">
        <label className="field"><span>Price change %</span><input type="number" step="0.1" value={scenario.priceChangePercent} onChange={(e) => setScenario({ ...scenario, priceChangePercent: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Sales volume change %</span><input type="number" step="0.1" value={scenario.volumeChangePercent} onChange={(e) => setScenario({ ...scenario, volumeChangePercent: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Extra fixed costs / month</span><input type="number" min="0" value={scenario.addedMonthlyFixedCost || ""} onChange={(e) => setScenario({ ...scenario, addedMonthlyFixedCost: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Extra payroll / month</span><input type="number" min="0" value={scenario.addedMonthlyPayroll || ""} onChange={(e) => setScenario({ ...scenario, addedMonthlyPayroll: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Extra marketing / month</span><input type="number" min="0" value={scenario.addedMonthlyMarketing || ""} onChange={(e) => setScenario({ ...scenario, addedMonthlyMarketing: Number(e.target.value) || 0 })} /></label>
      </div>
      <div className="metric-grid">
        <article><span>Projected monthly revenue</span><strong>{money(scenarioResult.projectedRevenue)}</strong></article>
        <article><span>Projected monthly result</span><strong className={scenarioResult.projectedResult < 0 ? "negative" : "positive"}>{money(scenarioResult.projectedResult)}</strong></article>
        <article><span>Change vs today</span><strong className={scenarioResult.incrementalResult < 0 ? "negative" : "positive"}>{money(scenarioResult.incrementalResult)}</strong></article>
        <article><span>Revenue needed to cover new spend</span><strong>{money(scenarioResult.breakEvenExtraRevenue)}</strong></article>
      </div>
    </section>

    <section className="panel">
      <div className="section-heading"><span>Experiment portfolio</span><h3>Scale evidence, not optimism</h3></div>
      <form onSubmit={addInitiative} className="fields">
        <label className="field"><span>Experiment</span><input value={initiative.name} onChange={(e) => setInitiative({ ...initiative, name: e.target.value })} placeholder="Example: raise prices 5% on new quotes" /></label>
        <label className="field"><span>Hypothesis</span><textarea value={initiative.hypothesis} onChange={(e) => setInitiative({ ...initiative, hypothesis: e.target.value })} placeholder="What must be true for this to work?" /></label>
        <div className="two-cols">
          <label className="field"><span>One-off / monthly test cost</span><input type="number" min="0" value={initiative.cost || ""} onChange={(e) => setInitiative({ ...initiative, cost: Number(e.target.value) || 0 })} /></label>
          <label className="field"><span>Expected monthly revenue</span><input type="number" min="0" value={initiative.expectedMonthlyRevenue || ""} onChange={(e) => setInitiative({ ...initiative, expectedMonthlyRevenue: Number(e.target.value) || 0 })} /></label>
          <label className="field"><span>Expected monthly gross profit</span><input type="number" min="0" value={initiative.expectedMonthlyGrossProfit || ""} onChange={(e) => setInitiative({ ...initiative, expectedMonthlyGrossProfit: Number(e.target.value) || 0 })} /></label>
          <label className="field"><span>Owner</span><input value={initiative.owner} onChange={(e) => setInitiative({ ...initiative, owner: e.target.value })} /></label>
          <label className="field"><span>Review date</span><input type="date" value={initiative.reviewDate} onChange={(e) => setInitiative({ ...initiative, reviewDate: e.target.value })} /></label>
        </div>
        <button className="button primary">Add growth experiment</button>
      </form>
      {message && <p className="scenario-save-status">{message}</p>}
      <div className="item-list">
        {plan.initiatives.map((item) => <article key={item.id}>
          <div><strong>{item.name}</strong><span>{item.hypothesis || "No hypothesis recorded"} · owner {item.owner || "unassigned"} · review {item.reviewDate || "not set"}</span></div>
          <b>{money(item.expectedMonthlyRevenue)} expected / {money(item.actualMonthlyRevenue)} actual</b>
          <select value={item.status} onChange={(e) => updateInitiative(item.id, { status: e.target.value as GrowthInitiative["status"] })}><option value="idea">Idea</option><option value="testing">Testing</option><option value="scale">Scale</option><option value="stop">Stop</option><option value="complete">Complete</option></select>
          <input aria-label="Actual monthly revenue" type="number" min="0" placeholder="Actual monthly revenue" value={item.actualMonthlyRevenue || ""} onChange={(e) => updateInitiative(item.id, { actualMonthlyRevenue: Number(e.target.value) || 0 })} />
          <input aria-label="Actual monthly gross profit" type="number" min="0" placeholder="Actual monthly gross profit" value={item.actualMonthlyGrossProfit || ""} onChange={(e) => updateInitiative(item.id, { actualMonthlyGrossProfit: Number(e.target.value) || 0 })} />
        </article>)}
      </div>
    </section>
  </section>;
}
