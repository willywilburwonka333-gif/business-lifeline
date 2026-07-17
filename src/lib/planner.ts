import { calculateHealth } from "./calculations";
import type { BusinessData, BusinessReport, PlanAction } from "./types";

const action = (title: string, urgency: PlanAction["urgency"], impact: PlanAction["impact"], difficulty: PlanAction["difficulty"], reason: string): PlanAction =>
  ({ title, urgency, impact, difficulty, reason });

export function generateReport(data: BusinessData): BusinessReport {
  const m = calculateHealth(data);
  const urgentHelp = data.urgentConcerns.some((x) =>
    ["payroll", "tax", "legal", "debts", "closure"].includes(x),
  ) || data.overdueTax >= Math.max(10000, data.monthlyRevenue * 0.3);
  const warnings: string[] = [];
  const strengths: string[] = [];
  if (m.monthlyOperatingResult < 0) warnings.push(`The business is losing money each month at its current cost base.`);
  if (m.runwayMonths !== null && m.runwayMonths < 3) warnings.push(`Cash runway is under three months.`);
  if (data.overdueTax > 0) warnings.push(`Overdue tax needs an agreed payment plan.`);
  if (data.overdueSuppliers > 0) warnings.push(`Supplier arrears may disrupt essential trading relationships.`);
  if (data.overdueInvoices > data.monthlyRevenue * 0.2) warnings.push(`Overdue customer invoices are trapping working capital.`);
  if (m.monthlyOperatingResult >= 0) strengths.push(`The core monthly result is positive.`);
  if (data.yearsOperating >= 3) strengths.push(`${data.yearsOperating} years of trading history provides useful customer and sales data.`);
  if (data.cashAvailable >= data.fixedExpenses * 0.5) strengths.push(`Available cash provides some room to act.`);
  if (data.accountsReceivable > 0) strengths.push(`There is ${data.accountsReceivable.toLocaleString()} in receivables that may convert to cash.`);
  if (strengths.length === 0) strengths.push(`Completing this diagnosis early creates a clear basis for action.`);

  const risks = [
    ...(m.monthlyOperatingResult < 0 ? [`Ongoing monthly cash loss of ${Math.abs(m.monthlyOperatingResult).toLocaleString()}.`] : []),
    ...(data.overdueTax > 0 ? [`Tax arrears of ${data.overdueTax.toLocaleString()}.`] : []),
    ...(data.revenueTrend === "declining" ? ["Declining revenue without an immediate sales response."] : []),
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
    action("Rank products and services by contribution margin", "High", "High", "Moderate", "Focus sales and labour on work that generates cash, not just revenue."),
  ];
  const thirtyDays = [
    action("Renegotiate the three largest fixed costs", "High", "High", "Hard", "Structural cost reductions improve every future month."),
    action("Launch a focused revenue recovery offer", "High", "High", "Moderate", `A targeted offer should support the immediate goal: ${data.immediateGoal}.`),
    action("Set weekly cash and sales scorecards", "Medium", "Medium", "Easy", "Frequent tracking exposes slippage before it becomes a crisis."),
  ];
  const ninetyDays = [
    action("Review pricing and customer profitability", "Medium", "High", "Moderate", "Sustainable margins require pricing that covers the full cost to serve."),
    action("Restructure debt where viable", "Medium", "High", "Hard", "Matching repayments to realistic cash generation reduces recurring pressure."),
    action("Create a written resilience plan", "Medium", "Medium", "Moderate", "Cash reserves, trigger points, and contingencies prevent a repeat crisis."),
  ];
  return { metrics: m, warnings, strengths, risks, urgentHelp, today, sevenDays, thirtyDays, ninetyDays };
}
