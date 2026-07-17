import assert from "node:assert/strict";
import test from "node:test";
import { calculateHealth } from "./calculations.ts";
import { demoBusiness } from "./demo.ts";

test("calculates Riverbend Café deterministically", () => {
  const metrics = calculateHealth(demoBusiness);
  assert.equal(metrics.monthlyOperatingResult, -1500);
  assert.equal(metrics.operatingMargin, -4.7);
  assert.equal(metrics.runwayMonths, 9.3);
  assert.ok(metrics.overallScore >= 0 && metrics.overallScore <= 100);
});
