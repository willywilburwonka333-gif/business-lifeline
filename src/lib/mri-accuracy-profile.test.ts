import assert from "node:assert/strict";
import test from "node:test";
import { assessMriAccuracyProfile, emptyMriAccuracyProfile } from "./mri-accuracy-profile.ts";

test("flags deeper financial risks", () => {
  const result = assessMriAccuracyProfile({
    ...emptyMriAccuracyProfile(),
    businessStructure: "company",
    gstBasis: "exclusive",
    seasonality: "high",
    personalGuarantees: true,
    paygOutstanding: 12000,
    nextThirtyDayCreditors: 50000,
    availableFacilities: 10000,
    overdraftLimit: 5000,
    largestCustomerPercent: 55,
    oneOffIncome: 5000,
    oneOffExpenses: 20000,
  });
  assert.ok(result.risks.length >= 5);
  assert.ok(result.risks.some((risk) => /PAYG/i.test(risk)));
  assert.ok(result.risks.some((risk) => /single customer/i.test(risk)));
});

test("complete low-risk profile has high confidence and no warning", () => {
  const result = assessMriAccuracyProfile({
    ...emptyMriAccuracyProfile(),
    businessStructure: "sole-trader",
    gstBasis: "inclusive",
    seasonality: "low",
    personalGuarantees: false,
    largestCustomerPercent: 10,
  });
  assert.equal(result.confidence, 100);
  assert.deepEqual(result.risks, []);
});
