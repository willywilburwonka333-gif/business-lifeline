import assert from "node:assert/strict";
import test from "node:test";
import { calculateHealth } from "./calculations.ts";
import { demoBusiness, emptyBusiness } from "./demo.ts";
import type { BusinessData } from "./types.ts";

const makeBusiness = (overrides: Partial<BusinessData>): BusinessData => ({
  ...emptyBusiness,
  businessName: "Test Business",
  industry: "Professional services",
  country: "Australia",
  yearsOperating: 3,
  employees: 1,
  revenueTrend: "stable",
  biggestProblem: "Testing",
  immediateGoal: "Improve financial health",
  ...overrides,
});

test("calculates Riverbend Café deterministically and flags distress", () => {
  const metrics = calculateHealth(demoBusiness);
  assert.equal(metrics.monthlyOperatingResult, -1500);
  assert.equal(metrics.operatingMargin, -4.7);
  assert.equal(metrics.runwayMonths, 9.3);
  assert.ok(metrics.overallScore <= 35);
  assert.ok(["Severe", "Critical"].includes(metrics.pressureLevel));
  assert.ok(metrics.criticalTriggers.length > 0);
  assert.ok(metrics.scoreExplanation.length >= 4);
});

test("scores a healthy profitable sole trader strongly", () => {
  const metrics = calculateHealth(makeBusiness({
    employees: 0,
    monthlyRevenue: 18000,
    fixedExpenses: 4500,
    variableExpenses: 3000,
    ownerDrawings: 4000,
    loanRepayments: 500,
    cashAvailable: 30000,
    totalDebt: 6000,
    revenueTrend: "growing",
  }));

  assert.equal(metrics.monthlyOperatingResult, 6000);
  assert.equal(metrics.runwayMonths, null);
  assert.ok(metrics.overallScore >= 80);
  assert.equal(metrics.pressureLevel, "Stable");
  assert.equal(metrics.criticalTriggers.length, 0);
});

test("does not let cash runway hide uncovered overdue obligations", () => {
  const metrics = calculateHealth(makeBusiness({
    monthlyRevenue: 50000,
    fixedExpenses: 26000,
    variableExpenses: 18000,
    ownerDrawings: 5000,
    loanRepayments: 3000,
    cashAvailable: 20000,
    overdueTax: 24000,
    overdueSuppliers: 12000,
    totalDebt: 90000,
    revenueTrend: "declining",
  }));

  assert.equal(metrics.monthlyOperatingResult, -2000);
  assert.equal(metrics.runwayMonths, 10);
  assert.ok(metrics.overallScore <= 24);
  assert.equal(metrics.pressureLevel, "Critical");
  assert.ok(metrics.liquidityScore < 100);
  assert.ok(metrics.obligationsScore < 50);
  assert.ok(metrics.criticalTriggers.length >= 2);
});

test("handles a pre-revenue startup without invalid scores", () => {
  const metrics = calculateHealth(makeBusiness({
    yearsOperating: 0,
    monthlyRevenue: 0,
    fixedExpenses: 3000,
    variableExpenses: 1000,
    ownerDrawings: 0,
    loanRepayments: 0,
    cashAvailable: 20000,
    totalDebt: 5000,
    revenueTrend: "volatile",
  }));

  assert.equal(metrics.monthlyOperatingResult, -4000);
  assert.equal(metrics.runwayMonths, 5);
  assert.ok(Number.isFinite(metrics.overallScore));
  assert.ok(metrics.overallScore >= 0 && metrics.overallScore <= 100);
});

test("reduces confidence when supplied data is incomplete or inconsistent", () => {
  const metrics = calculateHealth(makeBusiness({
    monthlyRevenue: 10000,
    fixedExpenses: 4000,
    variableExpenses: 2000,
    accountsReceivable: 1000,
    overdueInvoices: 5000,
    biggestProblem: "",
    immediateGoal: "",
    industry: "",
  }));

  assert.ok(metrics.dataConfidence < 75);
  assert.match(metrics.scoreExplanation.at(-1) ?? "", /reduced confidence/i);
});

test("urgent payroll or legal concerns create an escalation trigger", () => {
  const metrics = calculateHealth(makeBusiness({
    monthlyRevenue: 30000,
    fixedExpenses: 12000,
    variableExpenses: 8000,
    ownerDrawings: 3000,
    loanRepayments: 1000,
    cashAvailable: 25000,
    urgentConcerns: ["Unable to pay super and received a statutory demand"],
  }));

  assert.ok(metrics.criticalTriggers.some((trigger) => /urgent payroll, legal, tax or closure/i.test(trigger)));
  assert.ok(metrics.overallScore <= 39);
  assert.equal(metrics.pressureLevel, "Severe");
});

test("keeps every score within zero and one hundred", () => {
  const metrics = calculateHealth(makeBusiness({
    monthlyRevenue: 1,
    fixedExpenses: 100000,
    overdueInvoices: 100000,
    overdueTax: 100000,
    overdueSuppliers: 100000,
    totalDebt: 1000000,
    revenueTrend: "declining",
  }));

  for (const score of [
    metrics.cashFlowScore,
    metrics.runwayScore,
    metrics.debtScore,
    metrics.revenueScore,
    metrics.liquidityScore,
    metrics.obligationsScore,
    metrics.dataConfidence,
    metrics.overallScore,
  ]) {
    assert.ok(score >= 0 && score <= 100);
  }
});
