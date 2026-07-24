import type { BusinessData, HealthMetrics, PressureLevel } from "./types";

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));
const round = (value: number, places = 1) =>
  Number(value.toFixed(places));

const pressureLevelFor = (score: number, criticalTriggers: string[]): PressureLevel => {
  if (criticalTriggers.length >= 2 || score < 25) return "Critical";
  if (criticalTriggers.length === 1 || score < 40) return "Severe";
  if (score < 55) return "High";
  if (score < 70) return "Watch";
  return "Stable";
};

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
  const urgentArrears = data.overdueTax + data.overdueSuppliers;
  const uncoveredArrears = Math.max(0, urgentArrears - data.cashAvailable);
  const uncoveredArrearsPressure = data.monthlyRevenue
    ? (uncoveredArrears / data.monthlyRevenue) * 100
    : uncoveredArrears > 0 ? 100 : 0;
  const liquidResources = data.cashAvailable + Math.max(0, data.overdueInvoices * 0.5);
  const nearTermPressure = urgentArrears + Math.max(0, monthlyBurn);

  const trendScores = { growing: 100, stable: 78, volatile: 42, declining: 22 };
  const revenueStability = trendScores[data.revenueTrend];
  const cashFlowScore = clamp(
    50 + operatingMargin * 2 - Math.min(receivablesPressure, 50) * 0.35,
  );
  const runwayScore = runwayMonths === null
    ? (result >= 0 ? 100 : 0)
    : clamp(runwayMonths * 20);
  const debtScore = clamp(
    100 -
      debtPressure * 1.5 -
      (data.overdueTax > 0 ? 12 : 0) -
      (data.overdueSuppliers > 0 ? 8 : 0) -
      Math.min(uncoveredArrearsPressure, 50) * 0.8,
  );
  const revenueScore = revenueStability;
  const liquidityCoverage = nearTermPressure > 0 ? liquidResources / nearTermPressure : 2;
  const liquidityScore = clamp(
    liquidityCoverage >= 2 ? 100 : liquidityCoverage * 50,
  );
  const obligationsScore = clamp(
    100 -
      (data.overdueTax > 0 ? 30 : 0) -
      (data.overdueSuppliers > 0 ? 22 : 0) -
      Math.min(uncoveredArrearsPressure, 60),
  );

  const confidenceChecks = [
    data.monthlyRevenue > 0,
    totalMonthlyOutgoings > 0,
    data.cashAvailable >= 0,
    data.accountsReceivable >= data.overdueInvoices,
    data.biggestProblem.trim().length >= 4,
    data.immediateGoal.trim().length >= 4,
    data.industry.trim().length >= 2,
    data.country.trim().length >= 2,
  ];
  const dataConfidence = Math.round(
    confidenceChecks.filter(Boolean).length / confidenceChecks.length * 100,
  );

  let overallScore = Math.round(
    cashFlowScore * 0.26 +
      runwayScore * 0.16 +
      liquidityScore * 0.18 +
      obligationsScore * 0.16 +
      debtScore * 0.14 +
      revenueScore * 0.10,
  );

  const criticalTriggers: string[] = [];
  if (data.overdueTax > 0) criticalTriggers.push("Tax obligations are overdue");
  if (data.overdueSuppliers > 0 && uncoveredArrears > 0) {
    criticalTriggers.push("Available cash does not cover overdue supplier and tax obligations");
  }
  if (result < 0 && runwayMonths !== null && runwayMonths < 1) {
    criticalTriggers.push("Less than one month of cash runway remains at the current loss rate");
  }
  if (data.monthlyRevenue === 0 && totalMonthlyOutgoings > 0 && data.yearsOperating > 0) {
    criticalTriggers.push("An operating business reported expenses but no current revenue");
  }
  const concernText = data.urgentConcerns.join(" ").toLowerCase();
  if (/(wage|payroll|super|statutory demand|court|legal action|director penalty|closure)/.test(concernText)) {
    criticalTriggers.push("The owner reported an urgent payroll, legal, tax or closure concern");
  }

  // Hard caps prevent a blended score from hiding immediate danger.
  if (urgentArrears > data.cashAvailable && urgentArrears > 0) {
    overallScore = Math.min(overallScore, result < 0 ? 34 : 44);
  }
  if (result < 0 && data.revenueTrend === "declining" && urgentArrears > 0) {
    overallScore = Math.min(overallScore, 30);
  }
  if (criticalTriggers.length >= 2) overallScore = Math.min(overallScore, 24);
  else if (criticalTriggers.length === 1) overallScore = Math.min(overallScore, 39);

  const scoreExplanation = [
    result < 0
      ? `Trading is currently losing ${Math.abs(round(result, 2))} per month.`
      : `Trading is currently producing ${round(result, 2)} per month after supplied outgoings.`,
    runwayMonths === null
      ? "The supplied monthly figures are cash-positive, so loss-based runway is not applicable."
      : `Cash runway is approximately ${round(runwayMonths)} months at the current monthly loss.`,
    urgentArrears > 0
      ? `${round(urgentArrears, 2)} of tax and supplier obligations are overdue.`
      : "No overdue tax or supplier obligations were supplied.",
    dataConfidence < 75
      ? "The result has reduced confidence because important assessment details appear incomplete or inconsistent."
      : "The supplied core assessment data is reasonably complete, but the score remains a screening indicator.",
  ];

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
    liquidityScore: Math.round(liquidityScore),
    obligationsScore: Math.round(obligationsScore),
    dataConfidence,
    overallScore,
    pressureLevel: pressureLevelFor(overallScore, criticalTriggers),
    criticalTriggers,
    scoreExplanation,
  };
}
