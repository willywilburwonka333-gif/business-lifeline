"use client";

import { useEffect, useMemo, useState } from "react";
import type { CashflowForecast } from "@/lib/cashflow-forecast";
import { compareRecoveryForecast, emptyRecoveryScenario, type RecoveryScenario } from "@/lib/forecast-recovery";

type CashField = "additionalWeeklyReceipts" | "additionalWeeklyCosts" | "weeklySupplierSavings" | "weeklyOtherSavings" | "oneOffCollection";
const moneyFields: { key: CashField; label: string; help: string }[] = [
  { key: "additionalWeeklyReceipts", label: "Extra cash collected each week", help: "Actual additional money arriving, not just extra invoiced sales." },
  { key: "additionalWeeklyCosts", label: "Extra weekly costs to earn that cash", help: "Extra stock, contractor, delivery or other costs required to make the improvement." },
  { key: "weeklySupplierSavings", label: "Real supplier cost reductions per week", help: "Lower prices or purchases only. Not unpaid or postponed supplier bills." },
  { key: "weeklyOtherSavings", label: "Other genuine weekly payment reductions", help: "Reductions to the existing 'Other payments' category, never essential wages, tax or loan payments." },
  { key: "oneOffCollection", label: "Additional one-off cash collection", help: "Only cash expected to arrive that is not already counted in baseline receipts." },
];

const currencyFor = (country: string) => country.toLowerCase().includes("australia") ? "AUD" : country.toLowerCase().includes("new zealand") ? "NZD" : country.toLowerCase().includes("united kingdom") ? "GBP" : country.toLowerCase().includes("canada") ? "CAD" : "USD";
const signedMoney = (value: number, country: string) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: currencyFor(country), maximumFractionDigits: 0, signDisplay: "exceptZero" }).format(value);
const weekOptions = Array.from({ length: 13 }, (_, index) => index + 1);

export function RecoveryForecast({ baseline, businessName, country }: { baseline: CashflowForecast; businessName: string; country: string }) {
  const storageKey = useMemo(() => "business-lifeline-recovery-forecast-v1:" + (businessName.trim().toLowerCase() || "current"), [businessName]);
  const [scenario, setScenario] = useState<RecoveryScenario>(emptyRecoveryScenario);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) { setScenario(emptyRecoveryScenario()); return; }
      const stored: unknown = JSON.parse(raw);
      setScenario(stored && typeof stored === "object" && !Array.isArray(stored)
        ? { ...emptyRecoveryScenario(), ...stored as Partial<RecoveryScenario> }
        : emptyRecoveryScenario());
    } catch { setScenario(emptyRecoveryScenario()); }
  }, [storageKey]);

  const comparison = useMemo(() => compareRecoveryForecast(baseline, scenario), [baseline, scenario]);
  const changeAmount = (key: CashField, value: number) => {
    setScenario((current) => ({ ...current, [key]: Number.isFinite(value) ? Math.max(0, value) : 0, ownerConfirmed: false }));
    setNotice("");
  };
  const save = () => {
    localStorage.setItem(storageKey, JSON.stringify(scenario));
    setNotice("Recovery proposal saved on this device. The current-course forecast was not changed.");
  };
  const reset = () => {
    setScenario(emptyRecoveryScenario());
    localStorage.removeItem(storageKey);
    setNotice("Recovery proposal cleared. The original cash forecast is unchanged.");
  };

  const graphValues = [
    ...comparison.original.weeks.map((week) => week.closingCash),
    ...comparison.recovery.weeks.map((week) => week.closingCash),
    0,
  ];
  const low = Math.min(...graphValues);
  const high = Math.max(...graphValues);
  const range = Math.max(1, high - low);
  const x = (index: number) => 18 + index / 12 * 514;
  const y = (value: number) => 16 + (high - value) / range * 150;
  const points = (weeks: typeof comparison.original.weeks) => weeks.map((week, i) => x(i) + "," + y(week.closingCash)).join(" ");
  const baselineEnd = comparison.original.endingCash;
  const proposedEnd = comparison.recovery.endingCash;

  return (
    <section className="recovery-forecast" aria-labelledby="recovery-forecast-title">
      <header className="recovery-forecast-head">
        <p className="eyebrow">13-WEEK RECOVERY FORECAST</p>
        <h4 id="recovery-forecast-title">Compare doing nothing with a practical recovery proposal</h4>
        <p>The current course is your existing forecast. Recovery is a <strong>what-if scenario</strong> based on amounts and dates you enter. Suggested Recovery Plan actions do not become guaranteed savings automatically.</p>
      </header>

      <div className="recovery-forecast-kpis">
        <article>
          <small>Current course · week 13</small>
          <strong className={baselineEnd < 0 ? "negative" : "positive"}>{signedMoney(baselineEnd, country)}</strong>
          <span>{comparison.original.firstShortfallWeek ? "Below zero from week " + comparison.original.firstShortfallWeek : "No forecast cash shortfall"}</span>
        </article>
        <article>
          <small>Recovery proposal · week 13</small>
          <strong className={proposedEnd < 0 ? "negative" : "positive"}>{signedMoney(proposedEnd, country)}</strong>
          <span>{!comparison.hasChanges ? "No changes entered" : comparison.recovery.firstShortfallWeek ? "Still below zero from week " + comparison.recovery.firstShortfallWeek : "Avoids a negative balance in this model"}</span>
        </article>
        <article>
          <small>Difference by week 13</small>
          <strong className={comparison.improvement < 0 ? "negative" : "positive"}>{signedMoney(comparison.improvement, country)}</strong>
          <span>Modelled difference, not money already earned or saved</span>
        </article>
      </div>

      <div className="recovery-forecast-chart">
        <svg viewBox="0 0 550 188" role="img" aria-label="Cash balances across 13 weeks, comparing current course and proposed recovery scenario" preserveAspectRatio="xMidYMid meet">
          <title>Cash forecast comparison: current course versus recovery proposal</title>
          <line x1="18" y1={y(0)} x2="532" y2={y(0)} className="recovery-forecast-zero" />
          <polyline points={points(comparison.original.weeks)} className="recovery-forecast-line-original" />
          <polyline points={points(comparison.recovery.weeks)} className="recovery-forecast-line-proposed" />
          <text x="18" y="183">Week 1</text>
          <text x="487" y="183">Week 13</text>
        </svg>
        <div className="recovery-forecast-legend"><span><i className="current" /> Current course</span><span><i className="proposed" /> Recovery proposal</span><span>Dashed line = zero cash</span></div>
      </div>

      <p className="recovery-forecast-target">
        {comparison.shortfallBeforeStart
          ? "The current forecast already goes below zero before your chosen recovery start week. Earlier cash support or faster action would also be needed."
          : comparison.weeklyLiftNeeded > 0
            ? "Illustrative target: at least " + signedMoney(comparison.weeklyLiftNeeded, country) + " additional NET cash each week from week " + comparison.startWeek + " may keep the current-course forecast at or above zero during these 13 weeks, assuming it arrives on schedule. This is not a promised outcome."
            : "The current-course forecast does not go below zero during these 13 weeks at the entered amounts."}
      </p>

      <div className="recovery-forecast-controls">
        <h5>Build a measurable recovery proposal</h5>
        <p>Use the priorities in the Recovery Plan to decide what could change, then enter only figures you can justify. Unentered improvements remain at zero.</p>
        <div className="recovery-forecast-fields">
          <label>
            <span>Recurring changes begin</span>
            <select value={scenario.startWeek} onChange={(event) => { setScenario((current) => ({ ...current, startWeek: Number(event.target.value), ownerConfirmed: false })); setNotice(""); }}>
              {weekOptions.map((week) => <option key={week} value={week}>Week {week}</option>)}
            </select>
          </label>
          {moneyFields.map((field) => <label key={field.key}>
            <span>{field.label}</span>
            <input type="number" min="0" step="0.01" inputMode="decimal" value={scenario[field.key]} onChange={(event) => changeAmount(field.key, Number(event.target.value))} />
            <small>{field.help}</small>
          </label>)}
          <label>
            <span>One-off collection arrives</span>
            <select value={scenario.collectionWeek} onChange={(event) => { setScenario((current) => ({ ...current, collectionWeek: Number(event.target.value), ownerConfirmed: false })); setNotice(""); }}>
              {weekOptions.map((week) => <option key={week} value={week}>Week {week}</option>)}
            </select>
          </label>
        </div>
        <label className="recovery-forecast-action">
          <span>Recovery actions, evidence, owner and due dates</span>
          <textarea rows={3} maxLength={2000} value={scenario.actionPlan} placeholder="Example: Owner reviews supplier quotes by Friday; verify $X/week lower materials cost before using that assumption." onChange={(event) => { setScenario((current) => ({ ...current, actionPlan: event.target.value, ownerConfirmed: false })); setNotice(""); }} />
        </label>
        <label className="recovery-forecast-confirm"><input type="checkbox" checked={scenario.ownerConfirmed} onChange={(event) => { setScenario((current) => ({ ...current, ownerConfirmed: event.target.checked })); setNotice(""); }} /> I have checked the proposed amounts, timing and actions with the business owner. This is still a forecast, not an achieved result.</label>
        {comparison.hasChanges && !scenario.actionPlan.trim() && <p className="recovery-forecast-notice">Record who will carry out these changes and what evidence supports the amounts before treating this as an actionable plan.</p>}
        {comparison.warnings.length > 0 && <div className="recovery-forecast-warnings"><b>Check these assumptions</b><ul>{comparison.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
        <div className="scenario-buttons">
          <button type="button" className="button primary" onClick={save}>Save recovery proposal</button>
          <button type="button" className="button ghost" onClick={reset}>Clear recovery proposal</button>
        </div>
        {notice && <p className="scenario-save-status" role="status">{notice}</p>}
      </div>

      <details className="recovery-forecast-details">
        <summary>Compare all 13 weeks</summary>
        <div className="recovery-forecast-table-scroll">
          <table>
            <thead><tr><th scope="col">Week</th><th scope="col">Current course</th><th scope="col">Recovery proposal</th><th scope="col">Difference</th></tr></thead>
            <tbody>{comparison.original.weeks.map((week, i) => {
              const proposed = comparison.recovery.weeks[i];
              const diff = proposed.closingCash - week.closingCash;
              return <tr key={week.week}>
                <th scope="row">{week.week}</th>
                <td className={week.closingCash < 0 ? "negative" : "positive"}>{signedMoney(week.closingCash, country)}</td>
                <td className={proposed.closingCash < 0 ? "negative" : "positive"}>{signedMoney(proposed.closingCash, country)}</td>
                <td className={diff < 0 ? "negative" : "positive"}>{signedMoney(diff, country)}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </details>
      <p className="recovery-forecast-disclaimer">Cash movement forecast only, not accounting profit. Recovery projections are conditional on actual collections, costs and payment dates. Seek qualified advice where payroll, tax, debt or solvency are at risk. Saving a scenario does not modify the original forecast or record an achieved improvement.</p>
    </section>
  );
}
