import assert from "node:assert/strict";
import test from "node:test";
import { generateReport } from "./planner";
import { selectPlaybook } from "./recovery-playbooks";
import type { BusinessData } from "./types";

const base: BusinessData = {
  businessName: "Test Business",
  industry: "Services",
  country: "Australia",
  yearsOperating: 5,
  employees: 3,
  monthlyRevenue: 50000,
  fixedExpenses: 15000,
  variableExpenses: 15000,
  ownerDrawings: 4000,
  loanRepayments: 2000,
  cashAvailable: 30000,
  accountsReceivable: 12000,
  overdueInvoices: 4000,
  totalDebt: 25000,
  overdueTax: 0,
  overdueSuppliers: 0,
  revenueTrend: "stable",
  biggestProblem: "Need a clearer plan",
  immediateGoal: "Improve profitability",
  urgentConcerns: [],
};

const choose = (changes: Partial<BusinessData>) => {
  const data = { ...base, ...changes };
  return selectPlaybook(data, generateReport(data));
};

test("tax debt takes priority when tax pressure is urgent", () => {
  assert.equal(choose({ overdueTax: 12000, urgentConcerns: ["tax"] }).id, "tax-debt");
});

test("monthly losses select the cashflow crisis playbook", () => {
  assert.equal(choose({ monthlyRevenue: 20000 }).id, "cashflow-crisis");
});

test("declining revenue selects the sales collapse playbook when cash remains stable", () => {
  assert.equal(choose({ revenueTrend: "declining", biggestProblem: "Sales and leads are falling" }).id, "sales-collapse");
});

test("growing businesses with capacity pressure select rapid growth", () => {
  assert.equal(choose({ revenueTrend: "growing", biggestProblem: "Too much work and capacity pressure" }).id, "rapid-growth");
});

test("sale intent selects business sale preparation", () => {
  assert.equal(choose({ immediateGoal: "Prepare the business to sell to a buyer" }).id, "sale-preparation");
});
