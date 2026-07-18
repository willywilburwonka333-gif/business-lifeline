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
  pressureFactors: [],
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
  const report = generateReport(makeBusiness({ employees: 0, monthlyRevenue: 18000, fixedExpenses: 4500, variableExpenses: 3000, ownerDrawings: 4000, loanRepayments: 500, cashAvailable: 30000, totalDebt: 6000, revenueTrend: "growing", urgentConcerns: [] }));
  assert.equal(report.urgentHelp, false);
  assert.ok(report.metrics.overallScore >= 80);
  assert.ok(report.strengths.some((strength) => strength.includes("positive")));
  assert.ok(!report.today.some((action) => action.title.includes("insolvency adviser")));
});

test("overdue invoices trigger a specific collection action", () => {
  const report = generateReport(makeBusiness({ monthlyRevenue: 30000, overdueInvoices: 12000, accountsReceivable: 15000 }));
  const collectionAction = report.today.find((action) => action.title === "Call every overdue customer");
  assert.ok(collectionAction);
  assert.ok(collectionAction.reason.includes("12,000"));
});

test("serious overdue tax triggers professional escalation even without selected concerns", () => {
  const report = generateReport(makeBusiness({ monthlyRevenue: 20000, overdueTax: 10000, urgentConcerns: [] }));
  assert.equal(report.urgentHelp, true);
  assert.ok(report.sevenDays.some((action) => action.title.includes("tax authority")));
});

test("pressure scan adds demand and margin warnings without changing the deterministic financial score", () => {
  const baseline = generateReport(makeBusiness({ pressureFactors: [] }));
  const scanned = generateReport(makeBusiness({ pressureFactors: ["demand", "margins"] }));
  assert.equal(scanned.metrics.overallScore, baseline.metrics.overallScore);
  assert.ok(scanned.warnings.some((warning) => warning.toLowerCase().includes("demand")));
  assert.ok(scanned.warnings.some((warning) => warning.toLowerCase().includes("margin")));
  assert.ok(scanned.sevenDays.some((action) => action.title.includes("customer-demand")));
});

test("over-expansion pressure adds a pause-and-review action", () => {
  const report = generateReport(makeBusiness({ pressureFactors: ["overexpansion"] }));
  assert.ok(report.thirtyDays.some((action) => action.title.includes("Pause expansion")));
});

test("industry guidance changes for hospitality, construction, retail and professional services", () => {
  const hospitality = generateReport(makeBusiness({ industry: "Café and hospitality" }));
  const construction = generateReport(makeBusiness({ industry: "Residential construction" }));
  const retail = generateReport(makeBusiness({ industry: "Retail store" }));
  const services = generateReport(makeBusiness({ industry: "Professional services" }));
  assert.ok(hospitality.industryRecommendations.some((item) => item.toLowerCase().includes("food")));
  assert.ok(construction.industryRecommendations.some((item) => item.toLowerCase().includes("progress")));
  assert.ok(retail.industryRecommendations.some((item) => item.toLowerCase().includes("stock")));
  assert.ok(services.industryRecommendations.some((item) => item.toLowerCase().includes("utilisation")));
});

test("non-financial pressure alone does not create an insolvency escalation", () => {
  const report = generateReport(makeBusiness({ pressureFactors: ["demand", "staffing", "marketing"], urgentConcerns: [], overdueTax: 0 }));
  assert.equal(report.urgentHelp, false);
  assert.ok(!report.today.some((action) => action.title.includes("insolvency adviser")));
});