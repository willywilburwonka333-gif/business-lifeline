import assert from "node:assert/strict";
import test from "node:test";
import { calculateHealth } from "./calculations.ts";
import { validateMriInput } from "./mri-validation.ts";
import { emptyBusiness } from "./demo.ts";
import type { BusinessData } from "./types.ts";

const base = (overrides: Partial<BusinessData> = {}): BusinessData => ({
  ...emptyBusiness,
  businessName: "Math Audit Business",
  industry: "Services",
  country: "Australia",
  yearsOperating: 4,
  employees: 3,
  monthlyRevenue: 50000,
  fixedExpenses: 18000,
  variableExpenses: 12000,
  ownerDrawings: 5000,
  loanRepayments: 2000,
  cashAvailable: 30000,
  accountsReceivable: 10000,
  overdueInvoices: 2000,
  totalDebt: 30000,
  overdueTax: 0,
  overdueSuppliers: 0,
  revenueTrend: "stable",
  biggestProblem: "Protect margins",
  immediateGoal: "Improve cash flow",
  urgentConcerns: [],
  ...overrides,
});

test("monthly result equals revenue minus every monthly outgoing", () => {
  const data = base();
  const metrics = calculateHealth(data);
  const expected = data.monthlyRevenue - data.fixedExpenses - data.variableExpenses - data.ownerDrawings - data.loanRepayments;
  assert.equal(metrics.monthlyOperatingResult, expected);
});

test("operating margin and expense ratio reconcile to one hundred percent", () => {
  const metrics = calculateHealth(base());
  assert.ok(Math.abs((metrics.operatingMargin + metrics.expenseRatio) - 100) <= 0.2);
});

test("more revenue with unchanged costs cannot reduce the health score", () => {
  const lower = calculateHealth(base({ monthlyRevenue: 40000 }));
  const higher = calculateHealth(base({ monthlyRevenue: 60000 }));
  assert.ok(higher.monthlyOperatingResult > lower.monthlyOperatingResult);
  assert.ok(higher.overallScore >= lower.overallScore);
});

test("more overdue tax cannot improve debt or overall health", () => {
  const clean = calculateHealth(base({ overdueTax: 0 }));
  const overdue = calculateHealth(base({ overdueTax: 25000 }));
  assert.ok(overdue.debtScore <= clean.debtScore);
  assert.ok(overdue.overallScore <= clean.overallScore);
});

test("more overdue invoices cannot improve cash-flow health", () => {
  const current = calculateHealth(base({ overdueInvoices: 2000 }));
  const worse = calculateHealth(base({ overdueInvoices: 30000 }));
  assert.ok(worse.receivablesPressure > current.receivablesPressure);
  assert.ok(worse.cashFlowScore <= current.cashFlowScore);
});

test("runway equals available cash divided by monthly burn", () => {
  const metrics = calculateHealth(base({
    monthlyRevenue: 30000,
    fixedExpenses: 20000,
    variableExpenses: 10000,
    ownerDrawings: 5000,
    loanRepayments: 1000,
    cashAvailable: 18000,
  }));
  assert.equal(metrics.monthlyOperatingResult, -6000);
  assert.equal(metrics.runwayMonths, 3);
});

test("all published metrics remain finite for valid non-negative inputs", () => {
  const metrics = calculateHealth(base({ monthlyRevenue: 0, cashAvailable: 0 }));
  for (const value of Object.values(metrics)) {
    if (typeof value === "number") assert.ok(Number.isFinite(value));
  }
});

test("separates actual cash receipts and payments from accrual operating surplus", () => {
  const data = base({ monthlyRevenue: 50000, fixedExpenses: 18000, variableExpenses: 12000,
    ownerDrawings: 5000, loanRepayments: 2000, cashAvailable: 30000,
    monthlyCashReceipts: 4000, monthlyCashPayments: 25000 });
  const result = calculateHealth(data);
  assert.equal(result.cashFlowBasis, "cash-receipts-payments");
  assert.equal(result.operatingSurplusEstimate, 20000);
  assert.equal(result.monthlyOperatingResult, -21000);
  assert.equal(result.runwayMonths, 1.4);
  assert.match(result.scoreExplanation[0], /actual cash receipts/i);
});
test("without actual collections, cash runway is explicitly provisional", () => {
  const result = calculateHealth(base());
  assert.equal(result.cashFlowBasis, "revenue-proxy");
  assert.equal(result.operatingSurplusEstimate, 20000);
  assert.ok(result.dataConfidence <= 65);
  assert.match(result.scoreExplanation.join(" "), /proxy/i);
});
test("actual cash values must be paired and finite", () => {
  assert.equal(validateMriInput(base({ monthlyCashReceipts: 5000 })).valid, false);
  assert.equal(validateMriInput(base({ monthlyCashReceipts: -1, monthlyCashPayments: 5000 })).valid, false);
  assert.equal(validateMriInput(base({ monthlyCashReceipts: 5000, monthlyCashPayments: Number.NaN })).valid, false);
  assert.equal(validateMriInput(base({ monthlyCashReceipts: 0, monthlyCashPayments: 5000 })).valid, true);
});
