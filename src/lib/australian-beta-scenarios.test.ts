import assert from "node:assert/strict";
import test from "node:test";
import { calculateHealth } from "./calculations.ts";
import { buildForecastFromMRI, calculateCashflowForecast } from "./cashflow-forecast.ts";
import { generateReport } from "./planner.ts";
import { selectPlaybook } from "./recovery-playbooks.ts";
import { emptyBusiness } from "./demo.ts";
import { emptyMriAccuracyProfile } from "./mri-accuracy-profile.ts";
import type { BusinessData } from "./types.ts";

const business = (overrides: Partial<BusinessData>): BusinessData => ({
  ...emptyBusiness,
  businessName: "Australian Beta Business",
  industry: "Services",
  country: "Australia",
  yearsOperating: 8,
  employees: 4,
  revenueTrend: "stable",
  biggestProblem: "Beta validation",
  immediateGoal: "Improve resilience",
  ...overrides,
});

test("beta A: distressed family hospitality business is escalated, not falsely reassured", () => {
  const data = business({
    businessName: "Family Table Cafe",
    industry: "Cafe and hospitality",
    employees: 7,
    monthlyRevenue: 62000,
    fixedExpenses: 29000,
    variableExpenses: 27000,
    ownerDrawings: 6500,
    loanRepayments: 4200,
    cashAvailable: 8500,
    accountsReceivable: 3000,
    overdueInvoices: 1200,
    totalDebt: 138000,
    overdueTax: 31000,
    overdueSuppliers: 18500,
    revenueTrend: "declining",
    biggestProblem: "Cash is running out and tax and suppliers are overdue",
    immediateGoal: "Survive the next 13 weeks",
    urgentConcerns: ["ATO debt and overdue suppliers"],
  });
  const metrics = calculateHealth(data);
  const report = generateReport(data);
  const playbook = selectPlaybook(data, report);
  const forecast = calculateCashflowForecast(buildForecastFromMRI(data, {
    ...emptyMriAccuracyProfile(),
    monthlyWages: 24000,
    monthlySuper: 2880,
    paygOutstanding: 9000,
    accountsPayable: 18500,
    nextThirtyDayCreditors: 14000,
    overdraftLimit: 20000,
    availableFacilities: 12000,
    oneOffIncome: 0,
    oneOffExpenses: 4500,
  }));
  assert.ok(metrics.overallScore < 40);
  assert.ok(["Severe", "Critical"].includes(metrics.pressureLevel));
  assert.ok(metrics.criticalTriggers.length > 0);
  assert.ok(["tax-debt", "cashflow-crisis"].includes(playbook.id));
  assert.equal(forecast.weeks[0].openingCash, 8500);
  assert.ok(forecast.warnings.some((w) => /not counted as cash/i.test(w)));
  assert.ok(forecast.firstShortfallWeek !== null);
});

test("beta B: medium construction/services employer remains measurable under complexity", () => {
  const data = business({
    businessName: "Metro Projects Group",
    industry: "Construction trades",
    employees: 38,
    monthlyRevenue: 720000,
    fixedExpenses: 210000,
    variableExpenses: 330000,
    ownerDrawings: 18000,
    loanRepayments: 32000,
    cashAvailable: 410000,
    accountsReceivable: 560000,
    overdueInvoices: 95000,
    totalDebt: 680000,
    overdueTax: 0,
    overdueSuppliers: 45000,
    revenueTrend: "stable",
  });
  const metrics = calculateHealth(data);
  const forecast = calculateCashflowForecast(buildForecastFromMRI(data, {
    ...emptyMriAccuracyProfile(),
    monthlyWages: 175000,
    monthlySuper: 21000,
    paygOutstanding: 65000,
    accountsPayable: 310000,
    nextThirtyDayCreditors: 230000,
    oneOffIncome: 90000,
    oneOffExpenses: 120000,
  }));
  assert.ok(Number.isFinite(metrics.overallScore));
  assert.ok(metrics.overallScore >= 0 && metrics.overallScore <= 100);
  assert.equal(forecast.weeks.length, 13);
  assert.ok(Number.isFinite(forecast.endingCash));
  assert.ok(forecast.confidence >= 90);
});

test("beta C: large successful Australian business does not generate false distress", () => {
  const data = business({
    businessName: "Southern National Services",
    industry: "Professional services",
    yearsOperating: 22,
    employees: 240,
    monthlyRevenue: 6800000,
    fixedExpenses: 1900000,
    variableExpenses: 2500000,
    ownerDrawings: 0,
    loanRepayments: 180000,
    cashAvailable: 7400000,
    accountsReceivable: 5100000,
    overdueInvoices: 240000,
    totalDebt: 6200000,
    overdueTax: 0,
    overdueSuppliers: 0,
    revenueTrend: "growing",
    biggestProblem: "Scale efficiently",
    immediateGoal: "Grow profitably",
  });
  const metrics = calculateHealth(data);
  const forecast = calculateCashflowForecast(buildForecastFromMRI(data, {
    ...emptyMriAccuracyProfile(),
    monthlyWages: 1650000,
    monthlySuper: 198000,
    paygOutstanding: 420000,
    accountsPayable: 1900000,
    nextThirtyDayCreditors: 1400000,
    oneOffIncome: 500000,
    oneOffExpenses: 350000,
  }));
  assert.ok(metrics.overallScore >= 60);
  assert.ok(!["Severe", "Critical"].includes(metrics.pressureLevel));
  assert.equal(metrics.criticalTriggers.length, 0);
  assert.equal(forecast.firstShortfallWeek, null);
  assert.equal(forecast.fundingGap, 0);
  assert.ok(forecast.endingCash > 0);
});
