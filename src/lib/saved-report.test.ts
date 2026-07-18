import assert from "node:assert/strict";
import test from "node:test";
import { calculateHealth } from "./calculations.ts";
import { demoBusiness } from "./demo.ts";
import { parseSavedReport } from "./saved-report.ts";

const validSavedReport = {
  data: demoBusiness,
  report: {
    metrics: calculateHealth(demoBusiness),
    warnings: ["Cash flow is under pressure."],
    strengths: ["The business has trading history."],
    risks: ["Current losses may reduce available cash."],
    urgentHelp: false,
    today: [],
    sevenDays: [],
    thirtyDays: [],
    ninetyDays: [],
  },
};

test("accepts a complete saved Business MRI report", () => {
  const parsed = parseSavedReport(JSON.stringify(validSavedReport));
  assert.ok(parsed);
  assert.equal(parsed.data.businessName, demoBusiness.businessName);
  assert.equal(parsed.report.metrics.monthlyOperatingResult, -1500);
});

test("rejects malformed JSON", () => {
  assert.equal(parseSavedReport("{broken"), null);
});

test("rejects incomplete saved data", () => {
  const invalid = { ...validSavedReport, data: { businessName: "Missing everything else" } };
  assert.equal(parseSavedReport(JSON.stringify(invalid)), null);
});

test("rejects non-finite financial data", () => {
  const invalid = {
    ...validSavedReport,
    data: { ...validSavedReport.data, monthlyRevenue: null },
  };
  assert.equal(parseSavedReport(JSON.stringify(invalid)), null);
});

test("rejects incomplete report metrics", () => {
  const invalid = {
    ...validSavedReport,
    report: { ...validSavedReport.report, metrics: { overallScore: 50 } },
  };
  assert.equal(parseSavedReport(JSON.stringify(invalid)), null);
});
