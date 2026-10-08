import test from "node:test";
import assert from "node:assert/strict";
import { clientBusinessId, isArchivedMri } from "./mri-cloud-archive.ts";
import { demoBusiness } from "./demo.ts";
import { generateReport } from "./planner.ts";

test("each Firebase owner has a distinct permanent archive path", () => {
  assert.notEqual(clientBusinessId("alice"), clientBusinessId("bob"));
  assert.equal(clientBusinessId("alice"), "business-alice");
});

test("archive refuses incomplete reports but accepts a complete MRI", () => {
  assert.equal(isArchivedMri({ id: "fake", businessId: "business-bob" }), false);
  const saved = { data: demoBusiness, report: generateReport(demoBusiness) };
  const value = {
    id: "scan-1", createdAt: "2026-10-08T00:00:00.000Z",
    businessId: "business-alice", createdBy: "alice",
    businessName: demoBusiness.businessName, saved,
  };
  assert.equal(isArchivedMri(value), true);
});
