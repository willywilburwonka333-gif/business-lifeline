import type { BusinessData, HealthMetrics } from "./types";

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));
const round = (value: number, places = 1) =>
  Number(value.toFixed(places));

export function calculateHealth(data: BusinessData): HealthMetrics {
  const totalMonthlyOutgoings =
    data.fixedExpenses + data.variableExpenses + data.ownerDrawings + data.loanRepayments;
  const result = data.monthlyRevenue - totalMonthlyOutgoings;
  const operatingMargin = data.monthlyRevenue
    ? (result / data.monthlyRevenue) * 100
    : -100;
  const expenseRatio = data.monthlyRevenue
    ? (totalMonthlyOutgoings / data.monthlyRevenue) * 100
    : 200;
  const monthlyBurn = Math.max(0, -result);
  const runwayMonths = monthlyBurn > 0 ? data.cashAvailable / monthlyBurn : null;
  const debtPressure = data.monthlyRevenue
    ? ((data.totalDebt + data.overdueTax + data.overdueSuppliers) /
        (data.monthlyRevenue * 12)) * 100
    : 100;
  const receivablesPressure = data.monthlyRevenue
    ? (data.overdueInvoices / data.monthlyRevenue) * 100
    : data.overdueInvoices > 0 ? 100 : 0;
  const trendScores = { growing: 100, stable: 78, volatile: 42, declining: 22 };
  const revenueStability = trendScores[data.revenueTrend];
  const cashFlowScore = clamp(50 + operatingMargin * 2 - Math.min(receivablesPressure, 50) * 0.35);
  const runwayScore = runwayMonths === null ? (result >= 0 ? 100 : 0) : clamp(runwayMonths * 20);
  const debtScore = clamp(100 - debtPressure * 1.5 - (data.overdueTax > 0 ? 12 : 0) - (data.overdueSuppliers > 0 ? 8 : 0));
  const revenueScore = revenueStability;
  const overallScore = Math.round(
    cashFlowScore * 0.35 + runwayScore * 0.25 + debtScore * 0.22 + revenueScore * 0.18,
  );

  return {
    monthlyOperatingResult: round(result, 2),
    operatingMargin: round(operatingMargin),
    expenseRatio: round(expenseRatio),
    runwayMonths: runwayMonths === null ? null : round(runwayMonths),
    debtPressure: round(debtPressure),
    receivablesPressure: round(receivablesPressure),
    revenueStability,
    cashFlowScore: Math.round(cashFlowScore),
    runwayScore: Math.round(runwayScore),
    debtScore: Math.round(debtScore),
    revenueScore: Math.round(revenueScore),
    overallScore,
  };
}
