import assert from "node:assert/strict";
import test from "node:test";
import { isWorkspaceTab, workspaceTabIds, workspaceTabs } from "./workspace.ts";

test("workspace has one unique definition for every supported tab", () => {
  assert.equal(workspaceTabs.length, workspaceTabIds.length);
  assert.deepEqual(workspaceTabs.map((tab) => tab.id), [...workspaceTabIds]);
  assert.equal(new Set(workspaceTabs.map((tab) => tab.id)).size, workspaceTabs.length);
});

test("dashboard is first and operating workspaces remain available", () => {
  assert.equal(workspaceTabs[0]?.id, "dashboard");
  assert.ok(workspaceTabs.some((tab) => tab.id === "resources"));
  assert.ok(workspaceTabs.some((tab) => tab.id === "cashflow"));
  assert.ok(workspaceTabs.some((tab) => tab.id === "operations"));
  assert.ok(workspaceTabs.some((tab) => tab.id === "run"));
});

test("workspace tab validator rejects unknown routes", () => {
  assert.equal(isWorkspaceTab("dashboard"), true);
  assert.equal(isWorkspaceTab("run"), true);
  assert.equal(isWorkspaceTab("resources"), true);
  assert.equal(isWorkspaceTab("report"), false);
  assert.equal(isWorkspaceTab(null), false);
});
