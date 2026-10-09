import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { demoBusiness } from "./demo";
import { generateReport } from "./planner";
import { buildRepairBlueprints, createRepairProject, repairProgress, repairStorageKey, readRepairStore } from "./repair-centre";

test("recovery templates don't invent a verified cause", () => {
  const data = { ...demoBusiness, businessName: "Pilot Mechanic", industry: "Vehicle mechanics", overdueInvoices: 1100 };
  const plans = buildRepairBlueprints(data, generateReport(data));
  const quote = plans.find(item => item.id === "quote-profitability");
  const receivables = plans.find(item => item.id === "receivables");
  assert.ok(quote?.relevant);
  assert.ok(receivables?.relevant);
  assert.match(quote.reason, /investigat|possible|if the owner/i);
  assert.ok(quote.evidence.length >= 2);
  assert.ok(quote.steps.length >= 3);
  assert.equal(plans.some(item => item.id === "cash-visibility"), true);
});

test("repair projects start as unverified drafts and record completion separately", () => {
  const data = { ...demoBusiness, businessName: "Sample Workshop", industry: "Trades" };
  const blueprint = buildRepairBlueprints(data, generateReport(data)).find(item => item.id === "quote-profitability");
  assert.ok(blueprint);
  const project = createRepairProject(blueprint, new Date("2026-10-09T00:00:00Z"), "repair-1");
  assert.equal(project.status, "draft");
  assert.equal(project.evidenceConfirmed, false);
  assert.ok(project.steps.every(item => item.done === false));
  assert.equal(repairProgress(project).percent, 0);
  assert.equal(repairProgress({ ...project, steps: project.steps.map(item => ({ ...item, done: true })) }).percent, 100);
});

test("repair storage is scoped to business owner and handles malformed browser values", () => {
  const alice = repairStorageKey("alice", "Pilot Workshop");
  const bob = repairStorageKey("bob", "Pilot Workshop");
  assert.notEqual(alice, bob);
  assert.equal(readRepairStore({ getItem: () => "{broken" }, alice).projects.length, 0);
  assert.equal(readRepairStore({ getItem: () => JSON.stringify({ version: 1, projects: [{ id: 14 }] }) }, alice).projects.length, 0);
});

test("repair UI is in Recover and its data is included in cloud workspace sync", () => {
  const router = readFileSync("src/components/saved-scenario-planner.tsx", "utf8");
  const cloud = readFileSync("src/components/firebase-workspace.tsx", "utf8");
  assert.match(router, /activeTool === "repairs"/);
  assert.match(router, /<RepairCentre saved=\{saved\}/);
  assert.match(cloud, /business-lifeline-repair-projects-v1:/);
});
