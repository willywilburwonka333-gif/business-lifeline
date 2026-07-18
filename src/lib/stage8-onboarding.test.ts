import assert from "node:assert/strict";
import test from "node:test";
import { demoBusiness } from "./demo.ts";
import { generateReport } from "./planner.ts";

const report = generateReport(demoBusiness);

test("Riverbend demo presents a meaningful recovery case", () => {
  assert.equal(demoBusiness.businessName, "Riverbend Café");
  assert.ok(report.metrics.monthlyOperatingResult < 0);
  assert.ok(demoBusiness.overdueInvoices > 0);
  assert.ok(demoBusiness.overdueTax + demoBusiness.overdueSuppliers > 0);
  assert.ok(report.today.length >= 1);
  assert.ok(report.sevenDays.length >= 1);
});

test("Riverbend demo contains enough runway and pressure for simulation", () => {
  assert.ok(demoBusiness.cashAvailable > 0);
  assert.notEqual(report.metrics.runwayMonths, null);
  assert.ok((report.metrics.runwayMonths ?? 0) > 0);
  assert.equal(demoBusiness.revenueTrend, "declining");
  assert.ok(demoBusiness.pressureFactors?.includes("margins"));
});
