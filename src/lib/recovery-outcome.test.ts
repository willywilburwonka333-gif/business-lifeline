import test from "node:test";
import assert from "node:assert/strict";
import { demoBusiness } from "./demo.ts";
import { applyCashflowAssumptions, emptyCashflowAssumptions } from "./cashflow-simulator.ts";
import { generateReport } from "./planner.ts";
import { buildRecoveryOutcome } from "./recovery-outcome.ts";

test("recovery outcome reports a positive operating turnaround", () => {
  const baseline = generateReport(demoBusiness);
  const assumptions = {
    ...emptyCashflowAssumptions(),
    priceChangePercent: 5,
    fixedCostChangePercent: -8,
    ownerDrawingsChange: -1000,
    invoicesCollected: 5000,
  };
  const projectedData = applyCashflowAssumptions(demoBusiness, assumptions);
  const projected = generateReport(projectedData);
  const outcome = buildRecoveryOutcome(demoBusiness, baseline, projectedData, projected, assumptions);

  assert.ok(outcome.monthlyImprovement > 0);
  assert.equal(outcome.projectedCash, demoBusiness.cashAvailable + 5000);
  assert.ok(outcome.nextActions.some((item) => item.includes("collection dates")));
  assert.ok(["improving", "break-even", "positive"].includes(outcome.status));
});

test("recovery outcome distinguishes one-off cash from operating repair", () => {
  const baseline = generateReport(demoBusiness);
  const assumptions = { ...emptyCashflowAssumptions(), extraCashInjection: 10000 };
  const projectedData = applyCashflowAssumptions(demoBusiness, assumptions);
  const projected = generateReport(projectedData);
  const outcome = buildRecoveryOutcome(demoBusiness, baseline, projectedData, projected, assumptions);

  assert.equal(outcome.monthlyImprovement, 0);
  assert.equal(outcome.cashImprovement, 10000);
  assert.ok(outcome.nextActions.some((item) => item.includes("runway support")));
});

test("unchanged assumptions produce a not-started outcome", () => {
  const baseline = generateReport(demoBusiness);
  const assumptions = emptyCashflowAssumptions();
  const projectedData = applyCashflowAssumptions(demoBusiness, assumptions);
  const projected = generateReport(projectedData);
  const outcome = buildRecoveryOutcome(demoBusiness, baseline, projectedData, projected, assumptions);

  assert.equal(outcome.status, "not-started");
  assert.equal(outcome.monthlyImprovement, 0);
});
