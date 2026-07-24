import assert from "node:assert/strict";
import test from "node:test";
import { buildForecastFromMRI, calculateCashflowForecast } from "./cashflow-forecast.ts";
import { emptyBusiness } from "./demo.ts";
import { emptyMriAccuracyProfile } from "./mri-accuracy-profile.ts";

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

test("applies payroll, PAYG, facilities and one-off accuracy inputs", () => {
  const forecast = buildForecastFromMRI({
    ...emptyBusiness,
    businessName: "Profile test",
    industry: "Retail",
    country: "Australia",
    monthlyRevenue: 26000,
    fixedExpenses: 6000,
    variableExpenses: 5000,
    cashAvailable: 8000,
  }, {
    ...emptyMriAccuracyProfile(),
    monthlyWages: 5200,
    monthlySuper: 520,
    paygOutstanding: 3000,
    accountsPayable: 12000,
    nextThirtyDayCreditors: 8000,
    overdraftLimit: 5000,
    availableFacilities: 2000,
    oneOffIncome: 1000,
    oneOffExpenses: 2500,
  });

  assert.equal(forecast.openingCash, 15000);
  assert.ok(forecast.weeks[0].wagesAndSuper > 0);
  assert.equal(forecast.weeks[0].taxPayments, 3000);
  assert.equal(forecast.weeks[0].oneOffCashIn, 1000);
  assert.equal(forecast.weeks[0].oneOffCashOut, 2500);
  assert.equal(forecast.weeks[0].supplierPayments, 2000);
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
