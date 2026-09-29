"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateCashflowForecast, type CashflowForecast, type CashflowForecastResult } from "@/lib/cashflow-forecast";
import { selectPlaybook } from "@/lib/recovery-playbooks";
import type { SavedReport } from "@/lib/saved-report";

const currencyFor = (country: string) => country.toLowerCase().includes("australia") ? "AUD" : country.toLowerCase().includes("new zealand") ? "NZD" : country.toLowerCase().includes("united kingdom") ? "GBP" : country.toLowerCase().includes("canada") ? "CAD" : "USD";
const money = (value: number, country: string) => new Intl.NumberFormat("en", { style: "currency", currency: currencyFor(country), maximumFractionDigits: 0 }).format(value);

export function RecoveryPlaybooks({ saved }: { saved: SavedReport }) {
  const recommended = useMemo(() => selectPlaybook(saved.data, saved.report), [saved]);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [forecast, setForecast] = useState<CashflowForecastResult | null>(null);
  useEffect(() => {
    const refresh = () => {
      try {
        const key = `business-lifeline-13-week-v1:${saved.data.businessName.trim().toLowerCase() || "current"}`;
        const raw = window.localStorage.getItem(key);
        setForecast(raw ? calculateCashflowForecast(JSON.parse(raw) as CashflowForecast) : null);
      } catch { setForecast(null); }
    };
    refresh();
    window.addEventListener("business-lifeline-forecast-updated", refresh);
    return () => window.removeEventListener("business-lifeline-forecast-updated", refresh);
  }, [saved.data.businessName]);
  const done = recommended.steps.filter((_, index) => completed[`${recommended.id}-${index}`]).length;
  const progress = Math.round((done / recommended.steps.length) * 100);

  const formatFinancialText = (value: string) => {
    const replacements = [
      saved.data.monthlyRevenue,
      saved.data.fixedExpenses + saved.data.variableExpenses,
      saved.data.fixedExpenses,
      saved.data.variableExpenses,
      saved.data.cashAvailable,
      saved.data.accountsReceivable,
      saved.data.overdueInvoices,
      saved.data.overdueTax,
      saved.data.overdueSuppliers,
      saved.data.overdueTax + saved.data.overdueSuppliers,
      saved.report.metrics.monthlyOperatingResult,
    ].filter((amount, index, all) => Number.isFinite(amount) && amount !== 0 && all.indexOf(amount) === index)
      .sort((a, b) => String(Math.abs(b)).length - String(Math.abs(a)).length);

    return replacements.reduce((text, amount) => text.replaceAll(String(amount), money(amount, saved.data.country)), value);
  };

  return (
    <section className="recovery-playbooks no-print">
      <div className="section-heading"><span>Recovery playbooks</span><h3>{recommended.name}</h3></div>
      {forecast?.firstShortfallWeek !== null && forecast?.firstShortfallWeek !== undefined && <aside className="urgent"><b>13-week forecast escalation</b><p>The saved forecast falls below zero in week {forecast.firstShortfallWeek}, with a funding gap of {money(forecast.fundingGap, saved.data.country)}. Treat closing this gap as part of the current recovery pathway.</p></aside>}
      <div className="playbook-hero">
        <div>
          <p className="playbook-severity">{recommended.severity} pathway</p>
          <p>{recommended.summary}</p>
          <small>{formatFinancialText(recommended.reason)}</small>
        </div>
        <div className="playbook-progress" aria-label={`${progress}% complete`}><strong>{progress}%</strong><span>{done} of {recommended.steps.length} steps</span></div>
      </div>
      <div className="playbook-grid">
        <div className="playbook-steps">
          {recommended.steps.map((step, index) => {
            const key = `${recommended.id}-${index}`;
            return (
              <article className={completed[key] ? "complete" : ""} key={key}>
                <label><input type="checkbox" checked={Boolean(completed[key])} onChange={(event) => setCompleted((current) => ({ ...current, [key]: event.target.checked }))} /><span>{step.timeframe}</span></label>
                <div><h4>{step.title}</h4><p>{step.action}</p><small><b>Why:</b> {formatFinancialText(step.evidence)}</small>{step.professional && <small><b>Consider:</b> {step.professional}</small>}</div>
              </article>
            );
          })}
        </div>
        <aside className="playbook-measures">
          <span>Success measures</span><h4>How to know this pathway is working</h4>
          {recommended.successMeasures.map((measure) => <p key={measure}>✓ {measure}</p>)}
          <div><b>Important</b><p>This playbook is decision support. Legal, tax, employment, finance and insolvency decisions should be checked by a qualified professional.</p></div>
        </aside>
      </div>
    </section>
  );
}
