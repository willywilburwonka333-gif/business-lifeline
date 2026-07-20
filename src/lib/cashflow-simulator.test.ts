import test from "node:test";
import assert from "node:assert/strict";
import { applyCashflowAssumptions, emptyCashflowAssumptions, rankSimulationImpacts } from "./cashflow-simulator.ts";
import { demoBusiness } from "./demo.ts";

test("empty assumptions preserve the MRI figures", () => {
  const projected = applyCashflowAssumptions(demoBusiness, emptyCashflowAssumptions());
  assert.equal(projected.monthlyRevenue, demoBusiness.monthlyRevenue);
  assert.equal(projected.cashAvailable, demoBusiness.cashAvailable);
});

test("price, sales and costs combine into one projection", () => {
  const projected = applyCashflowAssumptions(demoBusiness, {
    ...emptyCashflowAssumptions(),
    priceChangePercent: 10,
    salesVolumeChangePercent: 5,
    fixedCostChangePercent: -10,
    variableCostChangePercent: -5,
  });
  assert.ok(projected.monthlyRevenue > demoBusiness.monthlyRevenue);
  assert.ok(projected.fixedExpenses < demoBusiness.fixedExpenses);
});

test("invoice collection increases cash and reduces receivables", () => {
  const projected = applyCashflowAssumptions(demoBusiness, {
    ...emptyCashflowAssumptions(),
    invoicesCollected: 1000,
  });
  assert.equal(projected.cashAvailable, demoBusiness.cashAvailable + 1000);
  assert.equal(projected.overdueInvoices, Math.max(0, demoBusiness.overdueInvoices - 1000));
});

test("impact ranking puts material changes first", () => {
  const impacts = rankSimulationImpacts(demoBusiness, {
    ...emptyCashflowAssumptions(),
    fixedCostChangePercent: -20,
    invoicesCollected: 100,
  });
  assert.equal(impacts[0]?.label, "Fixed-cost change");
});
