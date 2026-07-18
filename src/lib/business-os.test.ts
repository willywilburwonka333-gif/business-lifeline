import assert from "node:assert/strict";
import test from "node:test";
import { createBusinessOs, osSummary } from "./business-os.ts";
import type { SavedReport } from "./saved-report.ts";

const saved = {
  data: {
    businessName: "Test Business", industry: "Trades", country: "Australia", yearsOperating: 4, employees: 3,
    monthlyRevenue: 50000, fixedExpenses: 25000, variableExpenses: 18000, ownerDrawings: 4000, loanRepayments: 3000,
    cashAvailable: 10000, accountsReceivable: 15000, overdueInvoices: 7000, totalDebt: 50000, overdueTax: 5000,
    overdueSuppliers: 2000, revenueTrend: "declining", biggestProblem: "Cash pressure", immediateGoal: "Restore positive cashflow", urgentConcerns: ["tax"],
  },
  report: {
    metrics: { monthlyOperatingResult: -1000, operatingMargin: -2, expenseRatio: 102, runwayMonths: 10, debtPressure: 1, receivablesPressure: 1, revenueStability: 50, cashFlowScore: 30, runwayScore: 45, debtScore: 40, revenueScore: 35, overallScore: 38 },
    warnings: [], strengths: [], risks: [], urgentHelp: false,
    today: [{ title: "Call overdue customers", urgency: "Critical", impact: "High", difficulty: "Easy", reason: "Collect cash" }],
    sevenDays: [{ title: "Prepare cashflow forecast", urgency: "High", impact: "High", difficulty: "Moderate", reason: "Control cash" }],
    thirtyDays: [], ninetyDays: [], industryRecommendations: [],
  },
} as SavedReport;

test("Business OS is seeded from MRI priorities and targets", () => {
  const state = createBusinessOs(saved, new Date("2026-07-18T00:00:00.000Z"));
  assert.equal(state.weekFocus, "Restore positive cashflow");
  assert.equal(state.revenueTarget, 50000);
  assert.equal(state.invoiceCollectionTarget, 7000);
  assert.equal(state.tasks.length, 2);
  assert.equal(state.tasks[0].priority, "Critical");
});

test("Business OS summary reports execution and control coverage", () => {
  const state = createBusinessOs(saved);
  state.tasks[0].done = true;
  state.contacts.push({ id: "c1", name: "Customer", type: "Customer", nextAction: "Call Monday", value: 7000 });
  state.documents[0].current = true;
  const summary = osSummary(state);
  assert.equal(summary.openTasks, 1);
  assert.equal(summary.completion, 50);
  assert.equal(summary.nextActions, 1);
  assert.equal(summary.currentDocuments, 1);
});
