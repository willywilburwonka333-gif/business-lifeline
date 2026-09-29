"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { GROWTH_PLAN_KEY, buildGrowthAnalysis, growthScenario, readGrowthPlan, readOperatingSnapshot, type GrowthInitiative, type GrowthPlan, type GrowthSegment } from "@/lib/growth-engine";
import type { SavedReport } from "@/lib/saved-report";

const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const currencyFor = (country: string) => country.toLowerCase().includes("australia") ? "AUD" : country.toLowerCase().includes("new zealand") ? "NZD" : country.toLowerCase().includes("united kingdom") ? "GBP" : country.toLowerCase().includes("canada") ? "CAD" : "USD";
const money = (value: number, country: string) => value.toLocaleString("en", { style: "currency", currency: currencyFor(country), maximumFractionDigits: 0 });

export function GrowthCentre({ saved }: { saved: SavedReport }) {
  const [plan, setPlan] = useState<GrowthPlan>(() => readGrowthPlan());
  const [operating, setOperating] = useState(() => readOperatingSnapshot());
  const [initiative, setInitiative] = useState({ name: "", hypothesis: "", cost: 0, expectedMonthlyRevenue: 0, expectedMonthlyGrossProfit: 0, owner: "", reviewDate: "" });
  const [scenario, setScenario] = useState({ priceChangePercent: 0, volumeChangePercent: 0, addedMonthlyFixedCost: 0, addedMonthlyPayroll: 0, addedMonthlyMarketing: 0 });
  const [segment, setSegment] = useState({ name: "", customers: 0, monthlyRevenue: 0, grossMarginPercent: 0, repeatRatePercent: 0 });
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

  const addSegment = (event: FormEvent) => {
    event.preventDefault();
    if (!segment.name.trim()) return;
    const next: GrowthSegment = { id: id("segment"), ...segment, name: segment.name.trim() };
    setPlan((current) => ({ ...current, segments: [next, ...(current.segments ?? [])] }));
    setSegment({ name: "", customers: 0, monthlyRevenue: 0, grossMarginPercent: 0, repeatRatePercent: 0 });
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
      <article><span>Current annualised revenue</span><strong>{money(analysis.currentAnnualRevenue, saved.data.country)}</strong><small>From the latest MRI</small></article>
      <article><span>Target annual revenue</span><strong>{money(analysis.targetAnnualRevenue, saved.data.country)}</strong><small>{money(analysis.revenueGap, saved.data.country)} growth gap</small></article>
      <article><span>Current margin</span><strong>{analysis.currentMargin}%</strong><small>Target {analysis.targetMargin}%</small></article>
      <article><span>Experiment coverage</span><strong>{analysis.targetCoveragePercent}%</strong><small>Of the monthly growth gap currently covered by active experiments</small></article>
      <article><span>Funding readiness</span><strong>{analysis.fundingReadiness}</strong><small>{money(analysis.capitalRequired, saved.data.country)} three-month test capital indicated from current plan</small></article>
      <article><span>Catalogue margin</span><strong>{analysis.averageCatalogueMargin ? `${analysis.averageCatalogueMargin}%` : "Needs price/cost data"}</strong><small>{analysis.lowMarginItems} recorded item(s) below 20% gross margin</small></article>
      <article><span>Quote conversion</span><strong>{analysis.quoteCount ? `${analysis.pipelineConversionPercent}%` : "Needs quote history"}</strong><small>{analysis.acceptedQuotes}/{analysis.quoteCount} recorded quotes accepted</small></article>
      <article><span>Payroll headroom</span><strong>{money(analysis.payrollHeadroomBeforeLoss, saved.data.country)}</strong><small>Approximate monthly headroom before current result reaches zero</small></article>
    </section>

    <section className="panel">
      <div className="section-heading"><span>Growth destination</span><h3>Set the target before spending to chase it</h3></div>
      <div className="fields money-fields">
        <label className="field"><span>Annual revenue target</span><input type="number" min="0" value={plan.annualRevenueTarget || ""} onChange={(e) => setPlan({ ...plan, annualRevenueTarget: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Target operating margin %</span><input type="number" min="0" max="100" value={plan.targetOperatingMargin} onChange={(e) => setPlan({ ...plan, targetOperatingMargin: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Target monthly owner income</span><input type="number" min="0" value={plan.targetMonthlyOwnerIncome || ""} onChange={(e) => setPlan({ ...plan, targetMonthlyOwnerIncome: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Target cash buffer (months)</span><input type="number" min="0" step="0.5" value={plan.targetCashBufferMonths} onChange={(e) => setPlan({ ...plan, targetCashBufferMonths: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Target date</span><input type="date" value={plan.targetDate} onChange={(e) => setPlan({ ...plan, targetDate: e.target.value })} /></label>
        <label className="field"><span>Recurring / contracted revenue %</span><input type="number" min="0" max="100" value={plan.recurringRevenuePercent ?? 0} onChange={(e) => setPlan({ ...plan, recurringRevenuePercent: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Repeat customer %</span><input type="number" min="0" max="100" value={plan.repeatCustomerPercent ?? 0} onChange={(e) => setPlan({ ...plan, repeatCustomerPercent: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Current capacity utilisation %</span><input type="number" min="0" max="150" value={plan.capacityUtilisationPercent ?? 0} onChange={(e) => setPlan({ ...plan, capacityUtilisationPercent: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Owner hours per week</span><input type="number" min="0" value={plan.ownerHoursPerWeek ?? 0} onChange={(e) => setPlan({ ...plan, ownerHoursPerWeek: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Largest customer % of revenue</span><input type="number" min="0" max="100" value={plan.largestCustomerPercent ?? 0} onChange={(e) => setPlan({ ...plan, largestCustomerPercent: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Monthly growth test budget</span><input type="number" min="0" value={plan.monthlyGrowthBudget ?? 0} onChange={(e) => setPlan({ ...plan, monthlyGrowthBudget: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Monthly marketing spend</span><input type="number" min="0" value={plan.monthlyMarketingSpend ?? 0} onChange={(e) => setPlan({ ...plan, monthlyMarketingSpend: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>New customers per month</span><input type="number" min="0" value={plan.newCustomersPerMonth ?? 0} onChange={(e) => setPlan({ ...plan, newCustomersPerMonth: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Monthly gross profit per customer</span><input type="number" min="0" value={plan.monthlyGrossProfitPerCustomer ?? 0} onChange={(e) => setPlan({ ...plan, monthlyGrossProfitPerCustomer: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Average customer lifetime (months)</span><input type="number" min="0" value={plan.averageCustomerLifetimeMonths ?? 0} onChange={(e) => setPlan({ ...plan, averageCustomerLifetimeMonths: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Growth strategy</span><textarea value={plan.strategy} onChange={(e) => setPlan({ ...plan, strategy: e.target.value })} placeholder="Example: grow recurring service revenue without increasing owner hours." /></label>
      </div>
    </section>

    <section className="panel">
      <div className="section-heading"><span>Growth unit economics</span><h3>Marketing and hiring economics</h3></div>
      <div className="metric-grid">
        <article><span>Customer acquisition cost</span><strong>{analysis.customerAcquisitionCost ? money(analysis.customerAcquisitionCost, saved.data.country) : "Needs inputs"}</strong><small>Marketing spend ÷ new customers</small></article>
        <article><span>Customer lifetime gross profit</span><strong>{analysis.customerLifetimeGrossProfit ? money(analysis.customerLifetimeGrossProfit, saved.data.country) : "Needs inputs"}</strong><small>Planning estimate from gross profit × lifetime</small></article>
        <article><span>LTV : CAC</span><strong>{analysis.ltvToCac ? `${analysis.ltvToCac.toFixed(1)}x` : "Needs inputs"}</strong><small>Planning ratio, not guaranteed customer economics</small></article>
        <article><span>Payroll headroom at target margin</span><strong>{money(analysis.payrollHeadroomBeforeTargetMargin, saved.data.country)}</strong><small>Current result less profit required to preserve the selected target margin</small></article>
      </div>
    </section>

    <div className="insight-grid">
      <section className="panel"><p className="eyebrow">Constraints</p><h3>What could break first</h3><ul>{analysis.constraints.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section className="panel"><p className="eyebrow">Opportunities</p><h3>Where to test first</h3><ul>{analysis.opportunities.map((item) => <li key={item}>{item}</li>)}</ul></section>
    </div>

    <section className="panel">
      <div className="section-heading"><span>Customer economics</span><h3>Segment customers by quality, not just revenue</h3></div>
      <form onSubmit={addSegment} className="fields">
        <label className="field"><span>Segment name</span><input value={segment.name} onChange={(e) => setSegment({ ...segment, name: e.target.value })} placeholder="Example: maintenance contracts / one-off residential / commercial" /></label>
        <div className="two-cols">
          <label className="field"><span>Customers</span><input type="number" min="0" value={segment.customers || ""} onChange={(e) => setSegment({ ...segment, customers: Number(e.target.value) || 0 })} /></label>
          <label className="field"><span>Monthly revenue</span><input type="number" min="0" value={segment.monthlyRevenue || ""} onChange={(e) => setSegment({ ...segment, monthlyRevenue: Number(e.target.value) || 0 })} /></label>
          <label className="field"><span>Gross margin %</span><input type="number" min="0" max="100" value={segment.grossMarginPercent || ""} onChange={(e) => setSegment({ ...segment, grossMarginPercent: Number(e.target.value) || 0 })} /></label>
          <label className="field"><span>Repeat / retention %</span><input type="number" min="0" max="100" value={segment.repeatRatePercent || ""} onChange={(e) => setSegment({ ...segment, repeatRatePercent: Number(e.target.value) || 0 })} /></label>
        </div>
        <button className="button primary">Add segment</button>
      </form>
      <div className="item-list">{(plan.segments ?? []).map((item) => <article key={item.id}><div><strong>{item.name}</strong><span>{item.customers} customers · {money(item.monthlyRevenue, saved.data.country)} monthly revenue</span></div><b>{item.grossMarginPercent}% margin · {item.repeatRatePercent}% repeat</b></article>)}</div>
    </section>

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
        <article><span>Projected monthly revenue</span><strong>{money(scenarioResult.projectedRevenue, saved.data.country)}</strong></article>
        <article><span>Projected monthly result</span><strong className={scenarioResult.projectedResult < 0 ? "negative" : "positive"}>{money(scenarioResult.projectedResult, saved.data.country)}</strong></article>
        <article><span>Change vs today</span><strong className={scenarioResult.incrementalResult < 0 ? "negative" : "positive"}>{money(scenarioResult.incrementalResult, saved.data.country)}</strong></article>
        <article><span>Revenue needed to cover new spend</span><strong>{money(scenarioResult.breakEvenExtraRevenue, saved.data.country)}</strong></article>
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
          <b>{money(item.expectedMonthlyRevenue, saved.data.country)} expected / {money(item.actualMonthlyRevenue, saved.data.country)} actual</b>
          <select value={item.status} onChange={(e) => updateInitiative(item.id, { status: e.target.value as GrowthInitiative["status"] })}><option value="idea">Idea</option><option value="testing">Testing</option><option value="scale">Scale</option><option value="stop">Stop</option><option value="complete">Complete</option></select>
          <input aria-label="Actual monthly revenue" type="number" min="0" placeholder="Actual monthly revenue" value={item.actualMonthlyRevenue || ""} onChange={(e) => updateInitiative(item.id, { actualMonthlyRevenue: Number(e.target.value) || 0 })} />
          <input aria-label="Actual monthly gross profit" type="number" min="0" placeholder="Actual monthly gross profit" value={item.actualMonthlyGrossProfit || ""} onChange={(e) => updateInitiative(item.id, { actualMonthlyGrossProfit: Number(e.target.value) || 0 })} />
        </article>)}
      </div>
    </section>
  </section>;
}
