import type { CashflowAssumptions } from "./cashflow-simulator";
import type { BusinessData, BusinessReport } from "./types";

export type RecoveryOutcome = {
  status: "not-started" | "improving" | "break-even" | "positive" | "worse";
  headline: string;
  monthlyImprovement: number;
  projectedMonthlyResult: number;
  cashImprovement: number;
  projectedCash: number;
  runwayChange: number | null;
  reviewWindow: string;
  nextActions: string[];
  professionalRecommendation: string;
};

export function buildRecoveryOutcome(
  baselineData: BusinessData,
  baselineReport: BusinessReport,
  projectedData: BusinessData,
  projectedReport: BusinessReport,
  assumptions: CashflowAssumptions,
): RecoveryOutcome {
  const monthlyImprovement = projectedReport.metrics.monthlyOperatingResult - baselineReport.metrics.monthlyOperatingResult;
  const cashImprovement = projectedData.cashAvailable - baselineData.cashAvailable;
  const changed = Object.values(assumptions).some((value) => value !== 0);
  const originalRunway = baselineReport.metrics.runwayMonths;
  const projectedRunway = projectedReport.metrics.runwayMonths;
  const runwayChange = originalRunway === null || projectedRunway === null ? null : Number((projectedRunway - originalRunway).toFixed(1));

  let status: RecoveryOutcome["status"] = "not-started";
  let headline = "Build a recovery combination";

  if (changed && monthlyImprovement < 0) {
    status = "worse";
    headline = "This combination increases pressure";
  } else if (changed && projectedReport.metrics.monthlyOperatingResult > 0) {
    status = "positive";
    headline = "Projected monthly result turns positive";
  } else if (changed && projectedReport.metrics.monthlyOperatingResult === 0) {
    status = "break-even";
    headline = "Projected monthly result reaches break-even";
  } else if (changed && monthlyImprovement > 0) {
    status = "improving";
    headline = "The business improves, but pressure remains";
  }

  const nextActions: string[] = [];
  if (assumptions.invoicesCollected > 0) nextActions.push(`Confirm collection dates for ${assumptions.invoicesCollected} in overdue invoices.`);
  if (assumptions.priceChangePercent !== 0) nextActions.push(`Validate the ${assumptions.priceChangePercent}% price assumption against customer response and margin.`);
  if (assumptions.salesVolumeChangePercent !== 0) nextActions.push(`Define the sales activity required to deliver the ${assumptions.salesVolumeChangePercent}% volume change.`);
  if (assumptions.fixedCostChangePercent !== 0 || assumptions.variableCostChangePercent !== 0) nextActions.push("Name the exact costs, owners and dates behind each saving assumption.");
  if (assumptions.ownerDrawingsChange !== 0 || assumptions.loanRepaymentChange !== 0) nextActions.push("Document the temporary drawings or repayment arrangement before relying on it.");
  if (assumptions.extraCashInjection > 0) nextActions.push("Treat new cash as runway support, not evidence that the operating model is repaired.");
  if (nextActions.length === 0) nextActions.push("Change at least one recovery lever and validate the result before creating a plan.");

  return {
    status,
    headline,
    monthlyImprovement,
    projectedMonthlyResult: projectedReport.metrics.monthlyOperatingResult,
    cashImprovement,
    projectedCash: projectedData.cashAvailable,
    runwayChange,
    reviewWindow: projectedReport.metrics.monthlyOperatingResult >= 0 ? "Review weekly for the next 4 weeks" : "Review within 7 days",
    nextActions: nextActions.slice(0, 4),
    professionalRecommendation: baselineReport.urgentHelp
      ? "Contact an accountant, turnaround adviser or licensed insolvency professional before relying on this scenario."
      : "Verify material tax, lending, employment and legal assumptions with an appropriately qualified adviser.",
  };
}
