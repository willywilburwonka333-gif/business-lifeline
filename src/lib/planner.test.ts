import assert from "node:assert/strict";
import test from "node:test";
import { demoBusiness, emptyBusiness } from "./demo.ts";
import { generateReport } from "./planner.ts";
import type { BusinessData } from "./types.ts";

const makeBusiness = (overrides: Partial<BusinessData>): BusinessData => ({
  ...emptyBusiness,
  businessName: "Test Business",
  industry: "Professional services",
  country: "Australia",
  yearsOperating: 3,
  employees: 1,
  monthlyRevenue: 20000,
  fixedExpenses: 7000,
  variableExpenses: 4000,
  ownerDrawings: 3500,
  loanRepayments: 500,
  cashAvailable: 25000,
  revenueTrend: "stable",
  biggestProblem: "Improve resilience",
  immediateGoal: "Protect cash flow",
  ...overrides,
});

test("distressed demo business receives urgent escalation and cash actions", () => {
  const report = generateReport(demoBusiness);

  assert.equal(report.urgentHelp, true);
  assert.ok(report.metrics.overallScore <= 35);
  assert.ok(report.warnings.some((warning) => warning.toLowerCase().includes("tax")));
  assert.ok(report.warnings.some((warning) => warning.toLowerCase().includes("supplier")));
  assert.ok(report.today.some((action) => action.title === "Call every overdue customer"));
  assert.ok(report.today.some((action) => action.title.includes("turnaround or insolvency adviser")));
});

test("healthy sole trader is not incorrectly escalated", () => {
  const report = generateReport(makeBusiness({
    employees: 0,
    monthlyRevenue: 18000,
    fixedExpenses: 4500,
    variableExpenses: 3000,
    ownerDrawings: 4000,
    loanRepayments: 500,
    cashAvailable: 30000,
    totalDebt: 6000,
    revenueTrend: "growing",
    urgentConcerns: [],
  }));

  assert.equal(report.urgentHelp, false);
  assert.ok(report.metrics.overallScore >= 80);
  assert.ok(report.strengths.some((strength) => strength.includes("positive")));
  assert.ok(!report.today.some((action) => action.title.includes("insolvency adviser")));
});

test("overdue invoices trigger a specific collection action", () => {
  const report = generateReport(makeBusiness({
    monthlyRevenue: 30000,
    overdueInvoices: 12000,
    accountsReceivable: 15000,
  }));

  const collectionAction = report.today.find((action) => action.title === "Call every overdue customer");
  assert.ok(collectionAction);
  assert.ok(collectionAction.reason.includes("12,000"));
});

test("serious overdue tax triggers professional escalation even without selected concerns", () => {
  const report = generateReport(makeBusiness({
    monthlyRevenue: 20000,
    overdueTax: 10000,
    urgentConcerns: [],
  }));

  assert.equal(report.urgentHelp, true);
  assert.ok(report.sevenDays.some((action) => action.title.includes("tax authority")));
});
