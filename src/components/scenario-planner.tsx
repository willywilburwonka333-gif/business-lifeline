"use client";

import { useMemo, useState } from "react";
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

export function ScenarioPlanner({ data, report }: { data: BusinessData; report: BusinessReport }) {
  const original: Scenario = {
    monthlyRevenue: data.monthlyRevenue,
    fixedExpenses: data.fixedExpenses,
    variableExpenses: data.variableExpenses,
    ownerDrawings: data.ownerDrawings,
    loanRepayments: data.loanRepayments,
    cashAvailable: data.cashAvailable,
  };

  const [scenario, setScenario] = useState<Scenario>(original);
  const projected = useMemo(() => generateReport({ ...data, ...scenario }), [data, scenario]);

  const fields: Array<[keyof Scenario, string]> = [
    ["monthlyRevenue", "Monthly revenue"],
    ["fixedExpenses", "Fixed expenses"],
    ["variableExpenses", "Variable expenses"],
    ["ownerDrawings", "Owner drawings"],
    ["loanRepayments", "Loan repayments"],
    ["cashAvailable", "Cash available"],
  ];

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
                onChange={(event) =>
                  setScenario((current) => ({
                    ...current,
                    [key]: Math.max(0, Number(event.target.value) || 0),
                  }))
                }
              />
            </label>
          ))}
          <button className="button ghost" type="button" onClick={() => setScenario(original)}>
            Reset scenario
          </button>
        </div>

        <div className="scenario-results">
          <article>
            <span>Health score</span>
            <b>{report.metrics.overallScore}/100</b>
            <strong>{projected.metrics.overallScore}/100</strong>
          </article>
          <article>
            <span>Monthly result</span>
            <b>{money(report.metrics.monthlyOperatingResult, data.country)}</b>
            <strong>{money(projected.metrics.monthlyOperatingResult, data.country)}</strong>
          </article>
          <article>
            <span>Cash runway</span>
            <b>{report.metrics.runwayMonths === null ? "Cash positive" : `${report.metrics.runwayMonths} months`}</b>
            <strong>{projected.metrics.runwayMonths === null ? "Cash positive" : `${projected.metrics.runwayMonths} months`}</strong>
          </article>
          <article>
            <span>Operating margin</span>
            <b>{report.metrics.operatingMargin}%</b>
            <strong>{projected.metrics.operatingMargin}%</strong>
          </article>
        </div>
      </div>
      <p className="scenario-key"><b>Current</b> → <strong>Projected</strong></p>
    </section>
  );
}
