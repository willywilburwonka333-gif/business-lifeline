"use client";

import { useEffect, useMemo, useState } from "react";
import type { SavedReport } from "@/lib/saved-report";
import {
  clearRecoveryHistory,
  readRecoveryHistory,
  recordRecoveryCheckpoint,
  type RecoveryCheckpoint,
} from "@/lib/recovery-history";

const currencyFor = (country: string) => {
  const value = country.toLowerCase();
  if (value.includes("australia")) return "AUD";
  if (value.includes("new zealand")) return "NZD";
  if (value.includes("united kingdom")) return "GBP";
  if (value.includes("canada")) return "CAD";
  return "USD";
};

const money = (value: number, country: string) => new Intl.NumberFormat("en", {
  style: "currency",
  currency: currencyFor(country),
  maximumFractionDigits: 0,
}).format(value);

const signed = (value: number) => `${value > 0 ? "+" : ""}${value}`;

export function RecoveryTimeline({ saved }: { saved: SavedReport }) {
  const [history, setHistory] = useState<RecoveryCheckpoint[]>([]);

  useEffect(() => {
    setHistory(recordRecoveryCheckpoint(saved));
  }, [saved]);

  const latest = history.at(-1);
  const previous = history.at(-2);
  const scoreChange = latest && previous ? latest.healthScore - previous.healthScore : 0;
  const cashChange = latest && previous ? latest.cashAvailable - previous.cashAvailable : 0;
  const obligationsChange = latest && previous ? latest.overdueObligations - previous.overdueObligations : 0;
  const visible = history.slice(-8);
  const maxScore = Math.max(100, ...visible.map(item => item.healthScore));

  const interpretation = useMemo(() => {
    if (history.length < 2) return "This is your first recovery checkpoint. Run another MRI after your figures change to measure progress.";
    if (scoreChange >= 5 && cashChange >= 0) return "The business is moving in the right direction. Health and available cash have improved since the previous MRI.";
    if (scoreChange > 0) return "Business health has improved, but review cash and overdue obligations before assuming the pressure is resolved.";
    if (scoreChange < 0) return "The latest MRI shows deterioration. Revisit today’s actions and consider professional advice if the decline continues.";
    if (obligationsChange < 0 || cashChange > 0) return "The overall score is steady, but underlying cash pressure has improved.";
    return "The business is broadly unchanged. Focus on completing the highest-impact actions before the next MRI.";
  }, [cashChange, history.length, obligationsChange, scoreChange]);

  const clear = () => {
    clearRecoveryHistory();
    const next = recordRecoveryCheckpoint(saved);
    setHistory(next);
  };

  if (!latest) return null;

  return (
    <section className="recovery-timeline no-print" aria-labelledby="recovery-timeline-title">
      <div className="section-heading">
        <span>Recovery timeline</span>
        <h3 id="recovery-timeline-title">Measure whether the business is recovering</h3>
      </div>

      <div className="recovery-summary">
        <article>
          <span>Current health</span>
          <strong>{latest.healthScore}/100</strong>
          <small className={scoreChange > 0 ? "positive" : scoreChange < 0 ? "negative" : ""}>
            {history.length > 1 ? `${signed(scoreChange)} since last MRI` : "First checkpoint"}
          </small>
        </article>
        <article>
          <span>Available cash</span>
          <strong>{money(latest.cashAvailable, saved.data.country)}</strong>
          <small className={cashChange > 0 ? "positive" : cashChange < 0 ? "negative" : ""}>
            {history.length > 1 ? `${cashChange >= 0 ? "+" : ""}${money(cashChange, saved.data.country)} change` : "Current position"}
          </small>
        </article>
        <article>
          <span>Monthly result</span>
          <strong>{money(latest.monthlyResult, saved.data.country)}</strong>
          <small>{latest.monthlyResult >= 0 ? "Cash-positive month" : "Monthly loss"}</small>
        </article>
        <article>
          <span>Overdue obligations</span>
          <strong>{money(latest.overdueObligations, saved.data.country)}</strong>
          <small className={obligationsChange < 0 ? "positive" : obligationsChange > 0 ? "negative" : ""}>
            {history.length > 1 ? `${obligationsChange > 0 ? "+" : ""}${money(obligationsChange, saved.data.country)} change` : "Tax and suppliers"}
          </small>
        </article>
      </div>

      <div className="recovery-chart" aria-label="Health score history">
        {visible.map((item, index) => (
          <article key={item.id}>
            <div className="recovery-bar-track">
              <i style={{ height: `${Math.max(8, (item.healthScore / maxScore) * 100)}%` }} />
            </div>
            <strong>{item.healthScore}</strong>
            <span>{new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(item.recordedAt))}</span>
            <small>{index === visible.length - 1 ? "Latest" : `MRI ${history.length - visible.length + index + 1}`}</small>
          </article>
        ))}
      </div>

      <div className={`recovery-interpretation ${scoreChange < 0 ? "warning" : ""}`}>
        <div><b>What the trend means</b><p>{interpretation}</p></div>
        <button type="button" className="button ghost" onClick={clear}>Reset history</button>
      </div>
    </section>
  );
}
