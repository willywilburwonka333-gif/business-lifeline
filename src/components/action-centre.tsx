"use client";

import { useMemo, useState } from "react";
import type { BusinessReport, PlanAction } from "@/lib/types";

type TimedAction = PlanAction & {
  id: string;
  timeframe: "Today" | "7 days" | "30 days" | "90 days";
};

const STORAGE_KEY = "business-lifeline-completed-actions-v1";

function loadCompleted(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function ActionCentre({ report }: { report: BusinessReport }) {
  const actions = useMemo<TimedAction[]>(() => {
    const groups: Array<[TimedAction["timeframe"], PlanAction[]]> = [
      ["Today", report.today],
      ["7 days", report.sevenDays],
      ["30 days", report.thirtyDays],
      ["90 days", report.ninetyDays],
    ];

    return groups.flatMap(([timeframe, items]) =>
      items.map((item, index) => ({
        ...item,
        timeframe,
        id: `${timeframe}-${index}-${item.title}`,
      })),
    );
  }, [report]);

  const [completed, setCompleted] = useState<string[]>(loadCompleted);
  const [filter, setFilter] = useState<"All" | TimedAction["timeframe"]>("All");

  const visible = filter === "All" ? actions : actions.filter((item) => item.timeframe === filter);
  const completedCount = actions.filter((item) => completed.includes(item.id)).length;
  const progress = actions.length ? Math.round((completedCount / actions.length) * 100) : 0;

  const toggle = (id: string) => {
    setCompleted((current) => {
      const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <section className="panel no-print" aria-labelledby="action-centre-title">
      <div className="section-heading">
        <span>Action centre</span>
        <h3 id="action-centre-title">Turn the rescue plan into completed work</h3>
      </div>

      <div className="metric-grid">
        <article>
          <span>Completed</span>
          <strong>{completedCount}/{actions.length}</strong>
          <small>Recommended actions</small>
        </article>
        <article>
          <span>Progress</span>
          <strong>{progress}%</strong>
          <small>Saved in this browser</small>
        </article>
      </div>

      <div className="form-actions" role="group" aria-label="Filter actions by timeframe">
        {(["All", "Today", "7 days", "30 days", "90 days"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={`button ${filter === value ? "primary" : "ghost"}`}
            onClick={() => setFilter(value)}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="action-grid">
        {visible.map((item) => {
          const done = completed.includes(item.id);
          return (
            <article className="action-card" key={item.id}>
              <div className="action-top">
                <strong>{item.title}</strong>
                <span className={`tag ${item.urgency.toLowerCase()}`}>{item.timeframe}</span>
              </div>
              <p>{item.reason}</p>
              <div className="meta">
                <span>Impact <b>{item.impact}</b></span>
                <span>Difficulty <b>{item.difficulty}</b></span>
              </div>
              <button
                type="button"
                className={`button ${done ? "ghost" : "primary"}`}
                aria-pressed={done}
                onClick={() => toggle(item.id)}
              >
                {done ? "Mark as not done" : "Mark complete"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
