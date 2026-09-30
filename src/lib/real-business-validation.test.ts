import test from "node:test";
import assert from "node:assert/strict";
import { calculateHealth } from "./calculations.ts";
import { generateReport } from "./planner.ts";
import type { BusinessData } from "./types.ts";

/**
 * Real-business regression fixtures.
 * Financial inputs are derived from publicly reported FY2026 statements and converted
 * to monthly equivalents where Business Lifeline's MRI expects monthly values.
 *
 * These tests deliberately assert broad diagnostic behaviour rather than pretending
 * public annual accounts reveal undisclosed overdue obligations or owner context.
 */

const base = (overrides: Partial<BusinessData>): BusinessData => ({
  businessName: "", industry: "", country: "Australia", yearsOperating: 5, employees: 1,
  monthlyRevenue: 1, fixedExpenses: 0, variableExpenses: 0, ownerDrawings: 0, loanRepayments: 0,
  cashAvailable: 0, accountsReceivable: 0, overdueInvoices: 0, totalDebt: 0, overdueTax: 0,
  overdueSuppliers: 0, revenueTrend: "stable", biggestProblem: "Validate financial health from public records.",
  immediateGoal: "Identify material pressure without inventing undisclosed facts.", urgentConcerns: [], pressureFactors: [],
  ...overrides,
});

test("City Chic FY26: detects accounting loss and retail pressure without inventing arrears", () => {
  // FY26 continuing revenue $130.532m; cost of sales $69.471m; employee/depreciation/rent/other/finance
  // expenses $65.934m; cash $5.162m; trade receivables $0.643m; past-due trade receivables $0.007m;
  // lease liabilities $27.401m. Source: City Chic FY26 Annual Report, 28 June 2026.
  const data = base({
    businessName: "City Chic Collective Limited", industry: "Retail", yearsOperating: 10,
    monthlyRevenue: 130_532_000 / 12,
    variableExpenses: 69_471_000 / 12,
    fixedExpenses: 65_934_000 / 12,
    cashAvailable: 5_162_000,
    accountsReceivable: 643_000,
    overdueInvoices: 7_000,
    totalDebt: 27_401_000,
    revenueTrend: "declining",
    pressureFactors: ["demand", "margins"],
  });
  const metrics = calculateHealth(data);
  const report = generateReport(data);
  assert.ok(metrics.monthlyOperatingResult < 0, "reported cost base should produce a monthly loss");
  assert.ok(report.warnings.some((warning) => /losing money|demand|margin/i.test(warning)));
  assert.equal(report.urgentHelp, false, "public accounts do not disclose overdue tax/payroll/legal crisis");
  assert.ok(report.industryRecommendations.some((item) => /stock|margin|freight|sell-through/i.test(item)));
});

test("Acrow FY26: recognises growth while surfacing receivables/debt exposure", () => {
  // FY26 revenue $315.784m, PBT $28.559m, cash $31.120m, receivables $91.950m,
  // 90+ day gross receivables $19.317m, loans/borrowings $164.094m plus lease liabilities $45.841m.
  // Source: Acrow FY26 Preliminary Financial Report, 30 June 2026.
  const variableAnnual = 166_741_000 + 17_629_000 + 35_387_000 + 5_122_000;
  const expenseAnnual = 315_784_000 - 28_559_000;
  const data = base({
    businessName: "Acrow Limited", industry: "Construction services", yearsOperating: 10,
    monthlyRevenue: 315_784_000 / 12,
    variableExpenses: variableAnnual / 12,
    fixedExpenses: (expenseAnnual - variableAnnual) / 12,
    cashAvailable: 31_120_000,
    accountsReceivable: 91_950_000,
    overdueInvoices: 19_317_000,
    totalDebt: 164_094_000 + 45_841_000,
    revenueTrend: "growing",
    biggestProblem: "Growth, debt and working-capital exposure must be assessed together.",
    immediateGoal: "Protect profitable growth and cash conversion.",
  });
  const metrics = calculateHealth(data);
  const report = generateReport(data);
  assert.ok(metrics.monthlyOperatingResult > 0, "FY26 operating profile should remain profitable");
  assert.ok(metrics.debtPressure > 0);
  assert.ok(metrics.receivablesPressure > 20, "90+ day receivables are material relative to monthly revenue");
  assert.ok(report.industryRecommendations.some((item) => /job|progress|variation|fixed-price/i.test(item)));
  assert.equal(report.urgentHelp, false, "debt alone must not be treated as insolvency");
});

test("Mader FY26: strong profitable control case must not be classified as crisis", () => {
  // FY26 revenue $1.00114bn; cost of sales $805.489m; marketing/admin/other/finance $106.345m;
  // cash $39.499m; receivables $184.777m; borrowings + leases $9.082m; operating cash flow $84.967m.
  // Source: Mader Group FY26 Annual Report, 30 June 2026.
  const data = base({
    businessName: "Mader Group Limited", industry: "Service and maintenance", yearsOperating: 10,
    monthlyRevenue: 1_001_140_000 / 12,
    variableExpenses: 805_489_000 / 12,
    fixedExpenses: 106_345_000 / 12,
    cashAvailable: 39_499_000,
    accountsReceivable: 184_777_000,
    overdueInvoices: 0,
    totalDebt: 9_082_000,
    revenueTrend: "growing",
    biggestProblem: "Validate that large receivables do not create a false crisis.",
    immediateGoal: "Continue profitable growth while controlling credit risk.",
  });
  const metrics = calculateHealth(data);
  const report = generateReport(data);
  assert.ok(metrics.monthlyOperatingResult > 0);
  assert.ok(metrics.overallScore >= 70, "profitable, growing, low-debt control should screen stable");
  assert.equal(metrics.pressureLevel, "Stable");
  assert.equal(report.urgentHelp, false);
  assert.ok(report.strengths.some((item) => /positive|cash|trading history/i.test(item)));
});

test("ASIC distressed construction benchmark: urgent inability to pay debts must escalate", () => {
  // ASIC's Sample Homes scenario reports six months of late contractor payments,
  // $60,000 overdue and inability to pay suppliers, contractors, employees, loans and taxes.
  // This is an official distress benchmark (not represented as a real named company).
  const data = base({
    businessName: "ASIC Sample Homes distress benchmark", industry: "Construction", yearsOperating: 6,
    monthlyRevenue: 100_000,
    variableExpenses: 80_000,
    fixedExpenses: 35_000,
    cashAvailable: 10_000,
    accountsReceivable: 45_000,
    overdueInvoices: 20_000,
    totalDebt: 150_000,
    overdueTax: 25_000,
    overdueSuppliers: 60_000,
    revenueTrend: "declining",
    biggestProblem: "Unable to pay suppliers, contractors, employees, loans and taxes.",
    immediateGoal: "Prevent collapse and obtain qualified advice.",
    urgentConcerns: ["payroll", "tax", "debts", "closure"],
    pressureFactors: ["costs", "margins", "operations"],
  });
  const metrics = calculateHealth(data);
  const report = generateReport(data);
  assert.ok(metrics.overallScore <= 24);
  assert.equal(metrics.pressureLevel, "Critical");
  assert.equal(report.urgentHelp, true);
  assert.ok(report.today.some((item) => /turnaround|insolvency adviser/i.test(item.title)));
  assert.ok(report.today.some((item) => /13-week cash forecast/i.test(item.title)));
});
