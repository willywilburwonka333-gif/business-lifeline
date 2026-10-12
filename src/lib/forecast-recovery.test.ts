import assert from "node:assert/strict";
import test from "node:test";
import { buildForecastFromMRI, calculateCashflowForecast } from "./cashflow-forecast.ts";
import { distressedDemoBusiness } from "./demo.ts";
import { compareRecoveryForecast, emptyRecoveryScenario } from "./forecast-recovery.ts";

test("baseline remains unchanged until a genuine scenario is entered", () => {
  const baseline = buildForecastFromMRI(distressedDemoBusiness);
  const before = JSON.stringify(baseline);
  const result = compareRecoveryForecast(baseline, emptyRecoveryScenario());
  assert.equal(JSON.stringify(baseline), before);
  assert.equal(result.hasChanges, false);
  assert.equal(result.improvement, 0);
  assert.deepEqual(result.original.weeks.map((w) => w.closingCash), result.recovery.weeks.map((w) => w.closingCash));
  assert.equal(result.original.firstShortfallWeek, 8);
  assert.equal(result.original.weeks[0].closingCash > 0, true);
  assert.equal(result.original.weeks[7].closingCash < 0, true);
});

test("recurring changes begin on the selected week and one-off receipts arrive only once", () => {
  const baseline = buildForecastFromMRI(distressedDemoBusiness);
  const proposed = compareRecoveryForecast(baseline, {
    ...emptyRecoveryScenario(),
    startWeek: 4,
    additionalWeeklyReceipts: 2000,
    additionalWeeklyCosts: 500,
    weeklySupplierSavings: 100,
    oneOffCollection: 3000,
    collectionWeek: 5,
  });
  assert.equal(proposed.recovery.weeks[2].closingCash, proposed.original.weeks[2].closingCash);
  assert.equal(Number((proposed.recovery.weeks[3].closingCash - proposed.original.weeks[3].closingCash).toFixed(2)), 1600);
  assert.equal(Number((proposed.recovery.weeks[4].closingCash - proposed.original.weeks[4].closingCash).toFixed(2)), 6200);
  assert.equal(proposed.improvement, 19000);
  assert.equal(proposed.recovery.endingCash - proposed.original.endingCash, 19000);
  assert.equal(proposed.original.firstShortfallWeek, 8);
  assert.equal(proposed.recovery.firstShortfallWeek, null);
  assert.equal(proposed.recovery.weeks[4].taxPayments, proposed.original.weeks[4].taxPayments);
});

test("supplier and other savings cannot exceed each week's existing payments", () => {
  const baseline = buildForecastFromMRI(distressedDemoBusiness);
  const result = compareRecoveryForecast(baseline, {
    ...emptyRecoveryScenario(),
    startWeek: 1,
    weeklySupplierSavings: 100000,
    weeklyOtherSavings: 100000,
  });
  assert.ok(result.projected.weeks.every((w) => w.supplierPayments === 0 && w.otherPayments === 0));
  assert.ok(result.projected.weeks.every((w) => w.loanRepayments >= 0 && w.rentAndLeases >= 0));
  assert.ok(result.warnings.some((warning) => /capped/.test(warning)));
  assert.ok(result.original.endingCash < result.recovery.endingCash);
});

test("additional sales receipts that cost more do not falsely improve cash flow", () => {
  const baseline = buildForecastFromMRI(distressedDemoBusiness);
  const result = compareRecoveryForecast(baseline, {
    ...emptyRecoveryScenario(),
    startWeek: 1,
    additionalWeeklyReceipts: 500,
    additionalWeeklyCosts: 700,
  });
  assert.equal(result.improvement, -2600);
  assert.ok(result.recovery.endingCash < result.original.endingCash);
});

test("target weekly lift reflects the minimum improvement required to avoid forecast negative cash", () => {
  const baseline = buildForecastFromMRI(distressedDemoBusiness);
  const result = compareRecoveryForecast(baseline, emptyRecoveryScenario());
  assert.ok(result.weeklyLiftNeeded > 0);
  const scenario = { ...emptyRecoveryScenario(), additionalWeeklyReceipts: result.weeklyLiftNeeded };
  const improved = compareRecoveryForecast(baseline, scenario);
  assert.equal(improved.recovery.firstShortfallWeek, null);
});

test("late recovery start flags earlier shortfalls that it cannot reverse", () => {
  const baseline = buildForecastFromMRI(distressedDemoBusiness);
  const result = compareRecoveryForecast(baseline, {
    ...emptyRecoveryScenario(),
    startWeek: 10,
    additionalWeeklyReceipts: 10000,
  });
  assert.equal(result.shortfallBeforeStart, true);
  assert.equal(result.recovery.firstShortfallWeek, 8);
  assert.equal(result.original.endingCash, calculateCashflowForecast(baseline).endingCash);
});
