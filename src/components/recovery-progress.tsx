"use client";

import { useEffect, useMemo, useState } from "react";
import { readRecoveryHistory, recordRecoveryCheckpoint, type RecoveryCheckpoint } from "@/lib/recovery-history";
import type { SavedReport } from "@/lib/saved-report";

const money = (value: number) => value.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

export function RecoveryProgress({ saved }: { saved: SavedReport }) {
  const [history, setHistory] = useState<RecoveryCheckpoint[]>([]);

  useEffect(() => {
    setHistory(recordRecoveryCheckpoint(saved));
  }, [saved]);

  const summary = useMemo(() => {
    if (!history.length) return null;
    const first = history[0];
    const latest = history[history.length - 1];
    return {
      first,
      latest,
      scoreChange: latest.healthScore - first.healthScore,
      monthlyResultChange: latest.monthlyResult - first.monthlyResult,
      cashChange: latest.cashAvailable - first.cashAvailable,
      obligationsChange: latest.overdueObligations - first.overdueObligations,
      days: Math.max(0, Math.floor((new Date(latest.recordedAt).getTime() - new Date(first.recordedAt).getTime()) / 86400000)),
    };
  }, [history]);

  if (!summary) return null;

  return <section className="panel">
    <div className="section-heading"><span>Recovery outcomes</span><h3>Is the business actually improving?</h3></div>
    <p className="template-note">Each materially changed MRI creates a checkpoint. This tracks outcomes rather than assuming that completing actions automatically means recovery.</p>
    <div className="metric-grid">
      <article><span>Pressure score change</span><strong className={summary.scoreChange >= 0 ? "positive" : "negative"}>{summary.scoreChange >= 0 ? "+" : ""}{summary.scoreChange}</strong><small>Across {summary.days} day{summary.days === 1 ? "" : "s"}</small></article>
      <article><span>Monthly result change</span><strong className={summary.monthlyResultChange >= 0 ? "positive" : "negative"}>{money(summary.monthlyResultChange)}</strong></article>
      <article><span>Cash change</span><strong className={summary.cashChange >= 0 ? "positive" : "negative"}>{money(summary.cashChange)}</strong></article>
      <article><span>Overdue obligations change</span><strong className={summary.obligationsChange <= 0 ? "positive" : "negative"}>{money(summary.obligationsChange)}</strong></article>
    </div>
    <div className="health-history">{history.slice(-12).map((point) => <div key={point.id}><i style={{ height: `${point.healthScore}%` }} /><span>{point.healthScore}</span><small>{new Date(point.recordedAt).toLocaleDateString("en-AU")}</small></div>)}</div>
  </section>;
}
