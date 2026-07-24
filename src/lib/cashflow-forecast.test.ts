import assert from "node:assert/strict";
import test from "node:test";
import { buildForecastFromMRI, calculateCashflowForecast } from "./cashflow-forecast.ts";
import { emptyBusiness } from "./demo.ts";

test("builds a thirteen week forecast from MRI monthly figures", () => {
  const forecast = buildForecastFromMRI({
    ...emptyBusiness,
    businessName: "Test",
    industry: "Services",
    country: "Australia",
    monthlyRevenue: 52000,
    fixedExpenses: 13000,
    variableExpenses: 13000,
    ownerDrawings: 5200,
    loanRepayments: 2600,
    cashAvailable: 10000,
  });
  assert.equal(forecast.weeks.length, 13);
  assert.equal(forecast.openingCash, 10000);
  assert.equal(forecast.weeks[0].customerReceipts, 12000);
});

test("identifies the first shortfall and minimum funding gap", () => {
  const forecast = buildForecastFromMRI({
    ...emptyBusiness,
    businessName: "Loss maker",
    industry: "Retail",
    country: "Australia",
    monthlyRevenue: 10000,
    fixedExpenses: 12000,
    variableExpenses: 6000,
    ownerDrawings: 1000,
    loanRepayments: 1000,
    cashAvailable: 3000,
  });
  const result = calculateCashflowForecast(forecast);
  assert.ok(result.firstShortfallWeek !== null);
  assert.ok(result.fundingGap > 0);
  assert.equal(result.usableRunwayWeeks, Math.max(0, (result.firstShortfallWeek ?? 1) - 1));
});

test("keeps a cash positive forecast above zero", () => {
  const forecast = buildForecastFromMRI({
    ...emptyBusiness,
    businessName: "Healthy",
    industry: "Professional services",
    country: "Australia",
    monthlyRevenue: 50000,
    fixedExpenses: 10000,
    variableExpenses: 8000,
    ownerDrawings: 4000,
    loanRepayments: 1000,
    cashAvailable: 20000,
  });
  const result = calculateCashflowForecast(forecast);
  assert.equal(result.firstShortfallWeek, null);
  assert.equal(result.fundingGap, 0);
  assert.ok(result.endingCash > forecast.openingCash);
});

test("warns when wages and tax are omitted", () => {
  const forecast = buildForecastFromMRI({
    ...emptyBusiness,
    businessName: "Employer",
    industry: "Hospitality",
    country: "Australia",
    employees: 5,
    monthlyRevenue: 30000,
    fixedExpenses: 10000,
    variableExpenses: 8000,
    cashAvailable: 10000,
  });
  const result = calculateCashflowForecast(forecast);
  assert.ok(result.warnings.some((warning) => /tax payments/i.test(warning)));
  assert.ok(result.warnings.some((warning) => /wages or super/i.test(warning)));
});
