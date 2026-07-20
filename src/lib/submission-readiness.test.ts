import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("submission package contains every required judge-facing document", () => {
  const required = [
    "README.md",
    "docs/SUBMISSION.md",
    "docs/DEMO_SCRIPT.md",
    "docs/ARCHITECTURE.md",
    "docs/USER_TESTING.md",
    "docs/RELEASE_CHECKLIST.md",
    ".env.example",
  ];

  for (const path of required) {
    assert.ok(read(path).trim().length > 0, `${path} should not be empty`);
  }
});

test("submission copy explains the product and responsible AI boundary", () => {
  const submission = read("docs/SUBMISSION.md");
  assert.match(submission, /Diagnose/i);
  assert.match(submission, /Prioritise/i);
  assert.match(submission, /Simulate/i);
  assert.match(submission, /Execute/i);
  assert.match(submission, /GPT-5\.6/);
  assert.match(submission, /deterministic/i);
  assert.match(submission, /does not diagnose insolvency/i);
  assert.match(submission, /Codex/);
});

test("demo and release documents cover the critical product journey", () => {
  const demo = read("docs/DEMO_SCRIPT.md");
  const release = read("docs/RELEASE_CHECKLIST.md");

  assert.match(demo, /Riverbend Café/);
  assert.match(demo, /Business Brain/);
  assert.match(demo, /Cashflow/i);
  assert.match(demo, /Business Operating System/);

  assert.match(release, /npm run check/i);
  assert.match(release, /private\/incognito/i);
  assert.match(release, /iPhone/i);
  assert.match(release, /fallback/i);
  assert.match(release, /final deployment/i);
});
