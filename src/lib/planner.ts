import { calculateHealth } from "./calculations.ts";
import type { BusinessData, BusinessReport, PlanAction } from "./types.ts";

const action = (title: string, urgency: PlanAction["urgency"], impact: PlanAction["impact"], difficulty: PlanAction["difficulty"], reason: string): PlanAction =>
  ({ title, urgency, impact, difficulty, reason });

function industryGuidance(industry: string): string[] {
  const value = industry.toLowerCase();
  if (value.includes("cafe") || value.includes("café") || value.includes("hospitality") || value.includes("restaurant")) return [
    "Measure labour, food and delivery-platform costs as a percentage of sales each week.",
    "Remove or reprice low-margin menu items and reduce waste before cutting high-selling products.",
    "Review rent, energy and supplier terms against realistic customer demand.",
  ];
  if (value.includes("construction") || value.includes("trad") || value.includes("building")) return [
    "Review every active job for progress-payment delays, variations and cost overruns.",
    "Stop accepting fixed-price work that does not cover labour, materials and contingency.",
    "Prioritise collection of certified progress claims and negotiate supplier terms early.",
  ];
  if (value.includes("retail") || value.includes("shop") || value.includes("store")) return [
    "Identify slow-moving stock and convert it to cash without discounting profitable lines unnecessarily.",
    "Track gross margin after freight, marketplace fees and promotions—not revenue alone.",
    "Reduce purchasing commitments until sell-through and customer demand improve.",
  ];
  if (value.includes("professional") || value.includes("consult") || value.includes("agency") || value.includes("service")) return [
    "Track billable utilisation, project profitability and client concentration each week.",
    "Invoice completed milestones immediately and shorten payment terms for new work.",
    "Reduce owner dependence by documenting delivery, sales and client-management processes.",
  ];
  return [
    "Rank products, services and customers by cash contribution rather than revenue alone.",
    "Review the three largest operating costs and the three largest sources of revenue concentration.",
    "Set a weekly cash, sales and margin review until the business is stable.",
  ];
}

export function generateReport(data: BusinessData): BusinessReport {
  const m = calculateHealth(data);
  const factors = data.pressureFactors ?? [];
  const urgentHelp = data.urgentConcerns.some((x) => ["payroll", "tax", "legal", "debts", "closure"].includes(x)) || data.overdueTax >= Math.max(10000, data.monthlyRevenue * 0.3);
  const warnings: string[] = [];
  const strengths: string[] = [];
  if (m.monthlyOperatingResult < 0) warnings.push("The business is losing money each month at its current cost base.");
  if (m.runwayMonths !== null && m.runwayMonths < 3) warnings.push("Cash runway is under three months.");
  if (data.overdueTax > 0) warnings.push("Overdue tax needs an agreed payment plan.");
  if (data.overdueSuppliers > 0) warnings.push("Supplier arrears may disrupt essential trading relationships.");
  if (data.overdueInvoices > data.monthlyRevenue * 0.2) warnings.push("Overdue customer invoices are trapping working capital.");
  if (factors.includes("demand")) warnings.push("The owner reports weakening customer demand or sales.");
  if (factors.includes("margins")) warnings.push("Pricing or margins may not be covering the full cost to serve.");
  if (factors.includes("staffing")) warnings.push("Staffing availability or labour cost is adding operating pressure.");
  if (factors.includes("overexpansion")) warnings.push("Recent expansion may have increased commitments faster than cash generation.");
  if (m.monthlyOperatingResult >= 0) strengths.push("The core monthly result is positive.");
  if (data.yearsOperating >= 3) strengths.push(`${data.yearsOperating} years of trading history provides useful customer and sales data.`);
  if (data.cashAvailable >= data.fixedExpenses * 0.5) strengths.push("Available cash provides some room to act.");
  if (data.accountsReceivable > 0) strengths.push(`There is ${data.accountsReceivable.toLocaleString()} in receivables that may convert to cash.`);
  if (strengths.length === 0) strengths.push("Completing this diagnosis early creates a clear basis for action.");

  const risks = [
    ...(m.monthlyOperatingResult < 0 ? [`Ongoing monthly cash loss of ${Math.abs(m.monthlyOperatingResult).toLocaleString()}.`] : []),
    ...(data.overdueTax > 0 ? [`Tax arrears of ${data.overdueTax.toLocaleString()}.`] : []),
    ...(data.revenueTrend === "declining" || factors.includes("demand") ? ["Declining customer demand without an immediate sales response."] : []),
    ...(data.overdueSuppliers > 0 ? [`Supplier arrears of ${data.overdueSuppliers.toLocaleString()}.`] : []),
    ...(data.totalDebt > data.monthlyRevenue ? ["Debt is high relative to monthly revenue."] : []),
  ].slice(0, 3);

  const today = [
    action("Build a 13-week cash forecast", "Critical", "High", "Moderate", "A weekly view shows exactly when cash gaps occur and what must be negotiated."),
    ...(data.overdueInvoices > 0 ? [action("Call every overdue customer", "Critical", "High", "Easy", `There is ${data.overdueInvoices.toLocaleString()} overdue and collection is the fastest cash lever.`)] : []),
    ...(urgentHelp ? [action("Contact a qualified turnaround or insolvency adviser", "Critical", "High", "Easy", "The reported warning signs need prompt, jurisdiction-specific professional assessment.")] : []),
  ].slice(0, 3);
  const sevenDays = [
    action("Freeze non-essential spending and owner drawings", "High", "High", "Moderate", "Protect cash while the business is under pressure."),
    ...(data.overdueTax > 0 ? [action("Contact the tax authority to propose a payment plan", "High", "High", "Moderate", "Early engagement can reduce enforcement risk and make payments predictable.")] : []),
    ...(factors.includes("demand") || factors.includes("marketing") ? [action("Run a focused customer-demand recovery test", "High", "High", "Moderate", "Test one specific offer and channel, then measure cash collected rather than attention alone.")] : []),
    action("Rank products and services by contribution margin", "High", "High", "Moderate", "Focus sales and labour on work that generates cash, not just revenue."),
  ].slice(0, 4);
  const thirtyDays = [
    action("Renegotiate the three largest fixed costs", "High", "High", "Hard", "Structural cost reductions improve every future month."),
    ...(factors.includes("overexpansion") ? [action("Pause expansion and review every new commitment", "High", "High", "Moderate", "Stop additional cash commitments until the existing business funds itself.")] : []),
    action("Launch a focused revenue recovery offer", "High", "High", "Moderate", `A targeted offer should support the immediate goal: ${data.immediateGoal}.`),
    action("Set weekly cash and sales scorecards", "Medium", "Medium", "Easy", "Frequent tracking exposes slippage before it becomes a crisis."),
  ].slice(0, 4);
  const ninetyDays = [
    action("Review pricing and customer profitability", "Medium", "High", "Moderate", "Sustainable margins require pricing that covers the full cost to serve."),
    action("Restructure debt where viable", "Medium", "High", "Hard", "Matching repayments to realistic cash generation reduces recurring pressure."),
    action("Create a written resilience plan", "Medium", "Medium", "Moderate", "Cash reserves, trigger points, and contingencies prevent a repeat crisis."),
  ];
  const industryRecommendations = industryGuidance(data.industry);

  const report: BusinessReport = {
    metrics: m,
    warnings,
    strengths,
    risks,
    urgentHelp,
    today,
    sevenDays,
    thirtyDays,
    ninetyDays,
    industryRecommendations,
  };

  return report;
}
