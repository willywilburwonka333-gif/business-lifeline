import { calculateCashflowForecast, type CashflowForecast } from "./cashflow-forecast";

export type RecoveryScenario = {
  startWeek: number;
  additionalWeeklyReceipts: number;
  additionalWeeklyCosts: number;
  weeklySupplierSavings: number;
  weeklyOtherSavings: number;
  oneOffCollection: number;
  collectionWeek: number;
  actionPlan: string;
  ownerConfirmed: boolean;
};

export const emptyRecoveryScenario = (): RecoveryScenario => ({
  startWeek: 2,
  additionalWeeklyReceipts: 0,
  additionalWeeklyCosts: 0,
  weeklySupplierSavings: 0,
  weeklyOtherSavings: 0,
  oneOffCollection: 0,
  collectionWeek: 2,
  actionPlan: "",
  ownerConfirmed: false,
});

const safe = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
const weekNumber = (value: number) => Number.isFinite(value) ? Math.min(13, Math.max(1, Math.trunc(value))) : 1;
const cents = (value: number) => Math.round(value * 100) / 100;

export function compareRecoveryForecast(baseline: CashflowForecast, scenario: RecoveryScenario) {
  const original = calculateCashflowForecast(baseline);
  const startWeek = weekNumber(scenario.startWeek);
  const collectionWeek = weekNumber(scenario.collectionWeek);
  const extraReceipts = safe(scenario.additionalWeeklyReceipts);
  const extraCosts = safe(scenario.additionalWeeklyCosts);
  const supplierReduction = safe(scenario.weeklySupplierSavings);
  const otherReduction = safe(scenario.weeklyOtherSavings);
  const once = safe(scenario.oneOffCollection);
  const warnings: string[] = [];

  const projected: CashflowForecast = {
    openingCash: baseline.openingCash,
    warnings: baseline.warnings,
    weeks: baseline.weeks.map((week, index) => {
      const active = index + 1 >= startWeek;
      const suppliers = safe(week.supplierPayments);
      const other = safe(week.otherPayments);
      const supplierSaved = active ? Math.min(supplierReduction, suppliers) : 0;
      const otherSaved = active ? Math.min(otherReduction, other) : 0;

      return {
        ...week,
        customerReceipts: safe(week.customerReceipts) + (active ? extraReceipts : 0),
        supplierPayments: suppliers - supplierSaved + (active ? extraCosts : 0),
        otherPayments: other - otherSaved,
        oneOffCashIn: safe(week.oneOffCashIn) + (index + 1 === collectionWeek ? once : 0),
      };
    }),
  };

  if (baseline.weeks.some((week, index) => index + 1 >= startWeek && safe(week.supplierPayments) < supplierReduction)) {
    warnings.push("Supplier payment reductions were capped at the forecast payments in affected weeks.");
  }
  if (baseline.weeks.some((week, index) => index + 1 >= startWeek && safe(week.otherPayments) < otherReduction)) {
    warnings.push("Other payment reductions were capped at the forecast payments in affected weeks.");
  }
  if (once > 0) warnings.push("The one-off collection must be additional to receipts already forecast, or it will be counted twice.");
  if (extraReceipts > 0) warnings.push("Additional receipts must be cash actually expected to arrive; include the extra cost of earning them.");
  if (supplierReduction > 0 || otherReduction > 0) warnings.push("Only count savings from genuinely reduced costs, not overdue bills simply postponed.");

  const recovery = calculateCashflowForecast(projected);
  const improvement = cents(recovery.endingCash - original.endingCash);
  const hasChanges = extraReceipts > 0 || extraCosts > 0 || supplierReduction > 0 || otherReduction > 0 || once > 0;

  let weeklyLiftNeeded = 0;
  for (const week of original.weeks) {
    if (week.week < startWeek) continue;
    if (week.closingCash < 0) {
      weeklyLiftNeeded = Math.max(weeklyLiftNeeded, -week.closingCash / (week.week - startWeek + 1));
    }
  }

  return {
    original,
    recovery,
    projected,
    improvement,
    hasChanges,
    startWeek,
    collectionWeek,
    weeklyLiftNeeded: Math.ceil(weeklyLiftNeeded * 100) / 100,
    shortfallBeforeStart: original.weeks.some((week) => week.week < startWeek && week.closingCash < 0),
    warnings,
  };
}
