"use client";

import { useEffect, useMemo, useState } from "react";
import { generateReport } from "@/lib/planner";
import type { BusinessData, BusinessReport } from "@/lib/types";

type Scenario = Pick<
  BusinessData,
  | "monthlyRevenue"
  | "fixedExpenses"
  | "variableExpenses"
  | "ownerDrawings"
  | "loanRepayments"
  | "cashAvailable"
>;

const currencyFor = (country: string) => {
  const value = country.toLowerCase();
  if (value.includes("australia")) return "AUD";
  if (value.includes("new zealand")) return "NZD";
  if (value.includes("united kingdom")) return "GBP";
  if (value.includes("canada")) return "CAD";
  return "USD";
};

const money = (value: number, country: string) =>
  new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyFor(country),
    maximumFractionDigits: 0,
  }).format(value);

const signed = (value: number, suffix = "") => `${value > 0 ? "+" : ""}${value}${suffix}`;

export function ScenarioPlanner({ data, report }: { data: BusinessData; report: BusinessReport }) {
  const original = useMemo<Scenario>(() => ({
    monthlyRevenue: data.monthlyRevenue,
    fixedExpenses: data.fixedExpenses,
    variableExpenses: data.variableExpenses,
    ownerDrawings: data.ownerDrawings,
    loanRepayments: data.loanRepayments,
    cashAvailable: data.cashAvailable,
  }), [data]);

  const storageKey = useMemo(
    () => `business-lifeline-scenario-v1:${data.businessName.trim().toLowerCase() || "current"}`,
    [data.businessName],
  );

  const [scenario, setScenario] = useState<Scenario>(original);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) {
        setScenario(original);
        return;
      }
      const parsed = JSON.parse(saved) as Partial<Scenario>;
      setScenario({ ...original, ...parsed });
    } catch {
      localStorage.removeItem(storageKey);
      setScenario(original);
    }
  }, [original, storageKey]);

  const projected = useMemo(() => generateReport({ ...data, ...scenario }), [data, scenario]);
  const changed = Object.keys(original).some((key) => scenario[key as keyof Scenario] !== original[key as keyof Scenario]);

  const scoreDelta = projected.metrics.overallScore - report.metrics.overallScore;
  const resultDelta = projected.metrics.monthlyOperatingResult - report.metrics.monthlyOperatingResult;
  const marginDelta = projected.metrics.operatingMargin - report.metrics.operatingMargin;
  const originalRunway = report.metrics.runwayMonths;
  const projectedRunway = projected.metrics.runwayMonths;
  const runwayDelta = originalRunway === null || projectedRunway === null ? null : Number((projectedRunway - originalRunway).toFixed(1));

  const interpretation = useMemo(() => {
    if (!changed) return "Change the figures to test a recovery option. Every result below recalculates immediately.";
    if (projected.metrics.monthlyOperatingResult >= 0 && report.metrics.monthlyOperatingResult < 0) {
      return "This scenario moves the business from a monthly loss to a positive monthly result. Check that every assumption is realistic before acting.";
    }
    if (scoreDelta >= 10) {
      return "This scenario materially improves the health score. It strengthens the operating position, but overdue tax, suppliers, debt, and legal concerns still require separate action.";
    }
    if (resultDelta > 0) {
      return "This scenario improves monthly cash performance, but it does not yet resolve every pressure. Consider combining it with invoice collection or cost reduction.";
    }
    if (resultDelta < 0 || scoreDelta < 0) {
      return "This scenario weakens the projected position. Review the assumptions before using it as a recovery plan.";
    }
    return "This scenario produces little overall change. A larger revenue, cost, drawings, or cash adjustment may be needed to materially improve the position.";
  }, [changed, projected.metrics.monthlyOperatingResult, report.metrics.monthlyOperatingResult, resultDelta, scoreDelta]);

  const fields: Array<[keyof Scenario, string]> = [
    ["monthlyRevenue", "Monthly revenue"],
    ["fixedExpenses", "Fixed expenses"],
    ["variableExpenses", "Variable expenses"],
    ["ownerDrawings", "Owner drawings"],
    ["loanRepayments", "Loan repayments"],
    ["cashAvailable", "Cash available"],
  ];

  const saveScenario = () => {
    localStorage.setItem(storageKey, JSON.stringify(scenario));
    setSavedMessage("Scenario saved in this browser.");
    window.setTimeout(() => setSavedMessage(""), 2500);
  };

  const resetScenario = () => {
    localStorage.removeItem(storageKey);
    setScenario(original);
    setSavedMessage("Scenario reset to the original MRI figures.");
    window.setTimeout(() => setSavedMessage(""), 2500);
  };

  return (
    <section className="scenario-planner no-print">
      <div className="section-heading">
        <span>Scenario planner</span>
        <h3>Test changes before you act</h3>
      </div>

      <div className="scenario-grid">
        <div className="scenario-inputs">
          {fields.map(([key, label]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              <input
                type="number"
                min="0"
                step="100"
                value={scenario[key]}
                onChange={(event) => {
                  setSavedMessage("");
                  setScenario((current) => ({
                    ...current,
                    [key]: Math.max(0, Number(event.target.value) || 0),
                  }));
                }}
              />
            </label>
          ))}
          <div className="scenario-buttons">
            <button className="button primary" type="button" onClick={saveScenario} disabled={!changed}>
              Save scenario
            </button>
            <button className="button ghost" type="button" onClick={resetScenario} disabled={!changed}>
              Reset scenario
            </button>
          </div>
          {savedMessage && <p className="scenario-save-status" role="status">{savedMessage}</p>}
        </div>

        <div>
          <div className="scenario-results" aria-live="polite">
            <article>
              <span>Health score</span>
              <b>{report.metrics.overallScore}/100</b>
              <strong>{projected.metrics.overallScore}/100</strong>
              <small className={scoreDelta > 0 ? "positive" : scoreDelta < 0 ? "negative" : ""}>{signed(scoreDelta, " points")}</small>
            </article>
            <article>
              <span>Monthly result</span>
              <b>{money(report.metrics.monthlyOperatingResult, data.country)}</b>
              <strong>{money(projected.metrics.monthlyOperatingResult, data.country)}</strong>
              <small className={resultDelta > 0 ? "positive" : resultDelta < 0 ? "negative" : ""}>{resultDelta > 0 ? "+" : ""}{money(resultDelta, data.country)}</small>
            </article>
            <article>
              <span>Cash runway</span>
              <b>{originalRunway === null ? "Cash positive" : `${originalRunway} months`}</b>
              <strong>{projectedRunway === null ? "Cash positive" : `${projectedRunway} months`}</strong>
              <small className={projectedRunway === null || (runwayDelta !== null && runwayDelta > 0) ? "positive" : runwayDelta !== null && runwayDelta < 0 ? "negative" : ""}>
                {projectedRunway === null && originalRunway !== null ? "Monthly result is now positive" : runwayDelta === null ? "No comparable runway" : signed(runwayDelta, " months")}
              </small>
            </article>
            <article>
              <span>Operating margin</span>
              <b>{report.metrics.operatingMargin}%</b>
              <strong>{projected.metrics.operatingMargin}%</strong>
              <small className={marginDelta > 0 ? "positive" : marginDelta < 0 ? "negative" : ""}>{signed(marginDelta, "%")}</small>
            </article>
          </div>
          <p className="scenario-key"><b>Current</b> → <strong>Projected</strong></p>
          <aside className={`scenario-interpretation ${resultDelta < 0 || scoreDelta < 0 ? "warning" : ""}`}>
            <b>What this scenario means</b>
            <p>{interpretation}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
