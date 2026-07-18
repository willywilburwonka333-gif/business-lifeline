import test from "node:test";
import assert from "node:assert/strict";
import { applyCashflowAssumptions, emptyCashflowAssumptions, rankSimulationImpacts } from "./cashflow-simulator.ts";
import { demoData } from "./demo.ts";

test("empty assumptions preserve the MRI figures", () => {
  const projected = applyCashflowAssumptions(demoData, emptyCashflowAssumptions());
  assert.equal(projected.monthlyRevenue, demoData.monthlyRevenue);
  assert.equal(projected.cashAvailable, demoData.cashAvailable);
});

test("price, sales and costs combine into one projection", () => {
  const projected = applyCashflowAssumptions(demoData, {
    ...emptyCashflowAssumptions(),
    priceChangePercent: 10,
    salesVolumeChangePercent: 5,
    fixedCostChangePercent: -10,
    variableCostChangePercent: -5,
  });
  assert.ok(projected.monthlyRevenue > demoData.monthlyRevenue);
  assert.ok(projected.fixedExpenses < demoData.fixedExpenses);
});

test("invoice collection increases cash and reduces receivables", () => {
  const projected = applyCashflowAssumptions(demoData, {
    ...emptyCashflowAssumptions(),
    invoicesCollected: 1000,
  });
  assert.equal(projected.cashAvailable, demoData.cashAvailable + 1000);
  assert.equal(projected.overdueInvoices, Math.max(0, demoData.overdueInvoices - 1000));
});

test("impact ranking puts material changes first", () => {
  const impacts = rankSimulationImpacts(demoData, {
    ...emptyCashflowAssumptions(),
    fixedCostChangePercent: -20,
    invoicesCollected: 100,
  });
  assert.equal(impacts[0]?.label, "Fixed-cost change");
});
