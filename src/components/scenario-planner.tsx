"use client";

import { useEffect, useMemo, useState } from "react";
import { applyCashflowAssumptions, emptyCashflowAssumptions, rankSimulationImpacts, type CashflowAssumptions } from "@/lib/cashflow-simulator";
import { generateReport } from "@/lib/planner";
import { buildRecoveryOutcome } from "@/lib/recovery-outcome";
import type { BusinessData, BusinessReport } from "@/lib/types";

const currencyFor = (country: string) => country.toLowerCase().includes("australia") ? "AUD" : country.toLowerCase().includes("new zealand") ? "NZD" : country.toLowerCase().includes("united kingdom") ? "GBP" : country.toLowerCase().includes("canada") ? "CAD" : "USD";
const money = (value: number, country: string) => new Intl.NumberFormat("en", { style: "currency", currency: currencyFor(country), maximumFractionDigits: 0 }).format(value);
const signed = (value: number, suffix = "") => `${value > 0 ? "+" : ""}${value}${suffix}`;

const fields: Array<{ key: keyof CashflowAssumptions; label: string; help: string; suffix?: string; step?: number }> = [
  { key: "priceChangePercent", label: "Price change", help: "Test a price rise or discount.", suffix: "%", step: 1 },
  { key: "salesVolumeChangePercent", label: "Sales volume change", help: "Estimate more or fewer sales.", suffix: "%", step: 1 },
  { key: "fixedCostChangePercent", label: "Fixed-cost change", help: "Use a negative number for savings.", suffix: "%", step: 1 },
  { key: "variableCostChangePercent", label: "Variable-cost change", help: "Test supplier or production savings.", suffix: "%", step: 1 },
  { key: "ownerDrawingsChange", label: "Owner drawings change", help: "Use a negative number to reduce drawings.", step: 100 },
  { key: "loanRepaymentChange", label: "Loan repayment change", help: "Use a negative number for negotiated relief.", step: 100 },
  { key: "invoicesCollected", label: "Overdue invoices collected", help: "One-off cash collected now.", step: 100 },
  { key: "extraCashInjection", label: "Extra cash injection", help: "Funding or owner contribution; not profit.", step: 100 },
];

export function ScenarioPlanner({ data, report }: { data: BusinessData; report: BusinessReport }) {
  const storageKey = useMemo(() => `business-lifeline-cashflow-v2:${data.businessName.trim().toLowerCase() || "current"}`, [data.businessName]);
  const [assumptions, setAssumptions] = useState<CashflowAssumptions>(emptyCashflowAssumptions());
  const [scenarioName, setScenarioName] = useState("Recovery option");
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { name?: string; assumptions?: Partial<CashflowAssumptions> };
      setScenarioName(saved.name || "Recovery option");
      setAssumptions({ ...emptyCashflowAssumptions(), ...(saved.assumptions || {}) });
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const projectedData = useMemo(() => applyCashflowAssumptions(data, assumptions), [data, assumptions]);
  const projected = useMemo(() => generateReport(projectedData), [projectedData]);
  const impacts = useMemo(() => rankSimulationImpacts(data, assumptions), [data, assumptions]);
  const changed = Object.values(assumptions).some((value) => value !== 0);
  const scoreDelta = projected.metrics.overallScore - report.metrics.overallScore;
  const resultDelta = projected.metrics.monthlyOperatingResult - report.metrics.monthlyOperatingResult;
  const cashDelta = projectedData.cashAvailable - data.cashAvailable;
  const originalRunway = report.metrics.runwayMonths;
  const projectedRunway = projected.metrics.runwayMonths;
  const runwayDelta = originalRunway === null || projectedRunway === null ? null : Number((projectedRunway - originalRunway).toFixed(1));
  const outcome = useMemo(() => buildRecoveryOutcome(data, report, projectedData, projected, assumptions), [data, report, projectedData, projected, assumptions]);

  const interpretation = !changed
    ? "Adjust the recovery levers to model a realistic plan. The figures update immediately."
    : projected.metrics.monthlyOperatingResult >= 0 && report.metrics.monthlyOperatingResult < 0
      ? "This combination moves the business from a monthly loss to a positive operating result. Validate every assumption before acting."
      : resultDelta > 0
        ? "This combination improves monthly performance but does not yet remove all pressure. The ranked drivers below show what contributes most."
        : "This combination does not improve the operating position. Rework the assumptions before treating it as a recovery plan.";

  const save = () => {
    localStorage.setItem(storageKey, JSON.stringify({ name: scenarioName.trim() || "Recovery option", assumptions }));
    setMessage("Scenario saved in this browser.");
    window.setTimeout(() => setMessage(""), 2500);
  };

  const reset = () => {
    localStorage.removeItem(storageKey);
    setAssumptions(emptyCashflowAssumptions());
    setScenarioName("Recovery option");
    setMessage("Simulator reset to the MRI baseline.");
    window.setTimeout(() => setMessage(""), 2500);
  };

  return (
    <section className="scenario-planner cashflow-simulator no-print">
      <div className="section-heading"><span>Stage 4 · Cashflow simulator</span><h3>Build and compare a recovery combination</h3></div>
      <p className="template-note">Test price, sales, costs, drawings, repayments, invoice collection and new cash together. A simulation is decision support, not a forecast guarantee.</p>

      <label className="field simulator-name"><span>Scenario name</span><input value={scenarioName} maxLength={80} onChange={(event) => setScenarioName(event.target.value)} /></label>

      <div className="simulator-layout">
        <div className="simulator-controls">
          {fields.map((field) => (
            <label className="simulator-control" key={field.key}>
              <span>{field.label}</span>
              <div><input type="number" step={field.step || 1} value={assumptions[field.key]} onChange={(event) => setAssumptions((current) => ({ ...current, [field.key]: Number(event.target.value) || 0 }))} />{field.suffix && <b>{field.suffix}</b>}</div>
              <small>{field.help}</small>
            </label>
          ))}
          <div className="scenario-buttons">
            <button className="button primary" type="button" onClick={save} disabled={!changed}>Save scenario</button>
            <button className="button ghost" type="button" onClick={reset} disabled={!changed}>Reset</button>
          </div>
          {message && <p className="scenario-save-status" role="status">{message}</p>}
        </div>

        <div className="simulator-output">
          <div className="scenario-results" aria-live="polite">
            <article><span>Health score</span><b>{report.metrics.overallScore}/100</b><strong>{projected.metrics.overallScore}/100</strong><small className={scoreDelta > 0 ? "positive" : scoreDelta < 0 ? "negative" : ""}>{signed(scoreDelta, " points")}</small></article>
            <article><span>Monthly result</span><b>{money(report.metrics.monthlyOperatingResult, data.country)}</b><strong>{money(projected.metrics.monthlyOperatingResult, data.country)}</strong><small className={resultDelta > 0 ? "positive" : resultDelta < 0 ? "negative" : ""}>{money(resultDelta, data.country)} change</small></article>
            <article><span>Cash available</span><b>{money(data.cashAvailable, data.country)}</b><strong>{money(projectedData.cashAvailable, data.country)}</strong><small className={cashDelta > 0 ? "positive" : ""}>{money(cashDelta, data.country)} added</small></article>
            <article><span>Cash runway</span><b>{originalRunway === null ? "Cash positive" : `${originalRunway} months`}</b><strong>{projectedRunway === null ? "Cash positive" : `${projectedRunway} months`}</strong><small className={projectedRunway === null || (runwayDelta !== null && runwayDelta > 0) ? "positive" : runwayDelta !== null && runwayDelta < 0 ? "negative" : ""}>{projectedRunway === null && originalRunway !== null ? "Monthly result turns positive" : runwayDelta === null ? "No comparable runway" : signed(runwayDelta, " months")}</small></article>
          </div>

          <aside className={`scenario-interpretation ${resultDelta < 0 || scoreDelta < 0 ? "warning" : ""}`}><b>What this scenario means</b><p>{interpretation}</p></aside>

          {changed && (
            <section className={`recovery-outcome ${outcome.status}`} aria-live="polite">
              <div className="recovery-outcome-heading">
                <div><span>Recovery outcome</span><h4>{outcome.headline}</h4></div>
                <b>{scenarioName.trim() || "Recovery option"}</b>
              </div>
              <div className="recovery-outcome-metrics">
                <article><span>Monthly improvement</span><strong>{money(outcome.monthlyImprovement, data.country)}</strong></article>
                <article><span>Projected result</span><strong>{money(outcome.projectedMonthlyResult, data.country)}</strong></article>
                <article><span>Projected cash</span><strong>{money(outcome.projectedCash, data.country)}</strong></article>
                <article><span>Runway change</span><strong>{outcome.runwayChange === null ? (projectedRunway === null ? "Cash positive" : "Not comparable") : signed(outcome.runwayChange, " months")}</strong></article>
              </div>
              <div className="recovery-outcome-plan">
                <section><span>Validate next</span><ol>{outcome.nextActions.map((action) => <li key={action}>{action}</li>)}</ol></section>
                <aside><span>Next review</span><strong>{outcome.reviewWindow}</strong><p>{outcome.professionalRecommendation}</p></aside>
              </div>
            </section>
          )}

          <div className="impact-ranking">
            <div><span>Ranked impact</span><h4>What moves the result most</h4></div>
            {impacts.length === 0 ? <p>No recovery lever has been changed yet.</p> : impacts.slice(0, 6).map((impact, index) => (
              <article key={impact.key}><b>{index + 1}</b><div><strong>{impact.label}</strong><small>{impact.monthlyImpact !== 0 ? `${money(impact.monthlyImpact, data.country)} monthly impact` : `${money(impact.cashImpact, data.country)} one-off cash impact`}</small></div></article>
            ))}
          </div>

          <div className="simulation-warning"><strong>Reality check</strong><p>Price rises may reduce sales; sales growth may increase variable costs; invoice collection and funding improve cash but do not fix an underlying monthly loss. Confirm tax, lending, employment and insolvency implications with qualified advisers.</p></div>
        </div>
      </div>
    </section>
  );
}
