"use client";

import { useEffect, useMemo, useState } from "react";
import { buildForecastFromMRI, calculateCashflowForecast, type CashflowForecast, type ForecastWeekInput } from "@/lib/cashflow-forecast";
import type { BusinessData } from "@/lib/types";

const currencyFor = (country: string) => country.toLowerCase().includes("australia") ? "AUD" : country.toLowerCase().includes("new zealand") ? "NZD" : country.toLowerCase().includes("united kingdom") ? "GBP" : country.toLowerCase().includes("canada") ? "CAD" : "USD";
const money = (value: number, country: string) => new Intl.NumberFormat("en", { style: "currency", currency: currencyFor(country), maximumFractionDigits: 0 }).format(value);

const editableFields: Array<{ key: keyof Omit<ForecastWeekInput, "week">; label: string }> = [
  { key: "customerReceipts", label: "Customer receipts" },
  { key: "wagesAndSuper", label: "Wages & super" },
  { key: "taxPayments", label: "Tax payments" },
  { key: "rentAndLeases", label: "Rent & leases" },
  { key: "supplierPayments", label: "Suppliers" },
  { key: "loanRepayments", label: "Loan repayments" },
  { key: "otherPayments", label: "Other payments" },
  { key: "oneOffCashIn", label: "One-off cash in" },
  { key: "oneOffCashOut", label: "One-off cash out" },
];

export function AccuracyBoost({ data }: { data: BusinessData }) {
  const storageKey = useMemo(() => `business-lifeline-13-week-v1:${data.businessName.trim().toLowerCase() || "current"}`, [data.businessName]);
  const [forecast, setForecast] = useState<CashflowForecast>(() => buildForecastFromMRI(data));
  const [expandedWeek, setExpandedWeek] = useState(1);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as CashflowForecast;
      if (Array.isArray(saved.weeks) && saved.weeks.length === 13) setForecast(saved);
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const result = useMemo(() => calculateCashflowForecast(forecast), [forecast]);

  const updateWeek = (weekIndex: number, key: keyof Omit<ForecastWeekInput, "week">, value: number) => {
    setForecast((current) => ({
      ...current,
      weeks: current.weeks.map((week, index) => index === weekIndex ? { ...week, [key]: Math.max(0, Number.isFinite(value) ? value : 0) } : week),
    }));
  };

  const copyWeekAcross = (weekIndex: number) => {
    const source = forecast.weeks[weekIndex];
    setForecast((current) => ({ ...current, weeks: current.weeks.map((week) => ({ ...source, week: week.week })) }));
    setMessage("Copied this week's recurring figures across all 13 weeks.");
    window.setTimeout(() => setMessage(""), 2500);
  };

  const save = () => {
    localStorage.setItem(storageKey, JSON.stringify(forecast));
    setMessage("13-week forecast saved in this browser.");
    window.setTimeout(() => setMessage(""), 2500);
  };

  const reset = () => {
    const next = buildForecastFromMRI(data);
    setForecast(next);
    localStorage.removeItem(storageKey);
    setExpandedWeek(1);
    setMessage("Forecast reset to the MRI estimates.");
    window.setTimeout(() => setMessage(""), 2500);
  };

  return (
    <section className="panel accuracy-boost no-print" aria-labelledby="accuracy-boost-title">
      <div className="section-heading"><span>Accuracy Boost · 13-week cashflow</span><h3 id="accuracy-boost-title">See when cash pressure is likely to hit</h3></div>
      <p className="template-note">Your MRI has pre-filled a weekly starting point. Edit only what is different, add known tax, wages, super and one-off payments, then save the forecast.</p>

      <div className="metric-grid">
        <article><span>First cash shortfall</span><strong>{result.firstShortfallWeek === null ? "No shortfall" : `Week ${result.firstShortfallWeek}`}</strong><small>Within the next 13 weeks</small></article>
        <article><span>Lowest cash balance</span><strong className={result.lowestClosingCash < 0 ? "negative" : "positive"}>{money(result.lowestClosingCash, data.country)}</strong><small>Lowest projected closing cash</small></article>
        <article><span>Funding gap</span><strong className={result.fundingGap > 0 ? "negative" : "positive"}>{money(result.fundingGap, data.country)}</strong><small>Minimum extra cash or relief needed</small></article>
        <article><span>Forecast confidence</span><strong>{result.confidence}%</strong><small>Based on completed weekly fields</small></article>
      </div>

      <label className="field"><span>Opening cash</span><div className="money-input"><span>$</span><input type="number" min="0" step="any" value={forecast.openingCash} onChange={(event) => setForecast((current) => ({ ...current, openingCash: Math.max(0, Number(event.target.value) || 0) }))} /></div><small>Cash actually available at the start of week 1.</small></label>

      <div className="forecast-week-list">
        {result.weeks.map((week, index) => {
          const open = expandedWeek === week.week;
          return <article className="panel" key={week.week}>
            <button type="button" className="button-reset forecast-week-summary" onClick={() => setExpandedWeek(open ? 0 : week.week)} aria-expanded={open}>
              <span><small>Week {week.week}</small><strong>{money(week.closingCash, data.country)} closing cash</strong></span>
              <span><small>Cash in {money(week.totalCashIn, data.country)}</small><small>Cash out {money(week.totalCashOut, data.country)}</small></span>
              <b>{open ? "−" : "+"}</b>
            </button>
            {open && <div className="fields money-fields">
              {editableFields.map((field) => <label className="field" key={field.key}><span>{field.label}</span><div className="money-input"><span>$</span><input type="number" min="0" step="any" value={forecast.weeks[index][field.key]} onChange={(event) => updateWeek(index, field.key, Number(event.target.value) || 0)} /></div></label>)}
              <button type="button" className="button ghost" onClick={() => copyWeekAcross(index)}>Copy this week across all weeks</button>
            </div>}
          </article>;
        })}
      </div>

      {result.warnings.length > 0 && <aside className="urgent" role="alert"><b>Check before relying on this forecast</b><ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></aside>}

      <div className="scenario-buttons"><button type="button" className="button primary" onClick={save}>Save forecast</button><button type="button" className="button ghost" onClick={reset}>Reset to MRI estimates</button></div>
      {message && <p className="scenario-save-status" role="status">{message}</p>}
      <p className="form-disclaimer">This is a planning forecast based on the figures entered. It is not a guarantee, solvency determination or substitute for professional advice.</p>
    </section>
  );
}
