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
    assert.ok(read(path).trim().length > 100, `${path} should contain meaningful content`);
  }
});

test("submission copy explains the core product and responsible AI boundary", () => {
  const submission = read("docs/SUBMISSION.md");
  assert.match(submission, /Diagnose → Prioritise → Simulate → Execute/);
  assert.match(submission, /GPT-5\.6/);
  assert.match(submission, /deterministic/i);
  assert.match(submission, /does not diagnose insolvency/i);
  assert.match(submission, /Codex/);
});

test("demo and release documents cover the critical product journey", () => {
  const demo = read("docs/DEMO_SCRIPT.md");
  const release = read("docs/RELEASE_CHECKLIST.md");

  for (const phrase of ["Riverbend Café", "Business Brain", "Cashflow Simulator", "Business Operating System"]) {
    assert.match(demo, new RegExp(phrase));
  }

  for (const phrase of ["npm run check", "private/incognito", "iPhone", "fallback", "final deployment"]) {
    assert.match(release, new RegExp(phrase, "i"));
  }
});
