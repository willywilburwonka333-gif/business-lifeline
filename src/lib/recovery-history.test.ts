import assert from "node:assert/strict";
import test from "node:test";
import { demoBusiness } from "./demo.ts";
import { generateReport } from "./planner.ts";
import {
  RECOVERY_HISTORY_KEY,
  readRecoveryHistory,
  recordRecoveryCheckpoint,
} from "./recovery-history.ts";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const saved = { data: demoBusiness, report: generateReport(demoBusiness) };

test("records the first MRI as a recovery checkpoint", () => {
  const storage = new MemoryStorage();
  const history = recordRecoveryCheckpoint(saved, storage, new Date("2026-07-18T01:00:00.000Z"));

  assert.equal(history.length, 1);
  assert.equal(history[0].healthScore, saved.report.metrics.overallScore);
  assert.equal(history[0].overdueObligations, demoBusiness.overdueTax + demoBusiness.overdueSuppliers);
  assert.ok(storage.getItem(RECOVERY_HISTORY_KEY));
});

test("does not duplicate an unchanged MRI", () => {
  const storage = new MemoryStorage();
  recordRecoveryCheckpoint(saved, storage, new Date("2026-07-18T01:00:00.000Z"));
  const history = recordRecoveryCheckpoint(saved, storage, new Date("2026-07-19T01:00:00.000Z"));

  assert.equal(history.length, 1);
});

test("records changed figures as a new checkpoint", () => {
  const storage = new MemoryStorage();
  recordRecoveryCheckpoint(saved, storage, new Date("2026-07-18T01:00:00.000Z"));

  const improvedData = { ...demoBusiness, monthlyRevenue: demoBusiness.monthlyRevenue + 5000, cashAvailable: demoBusiness.cashAvailable + 4000 };
  const improved = { data: improvedData, report: generateReport(improvedData) };
  const history = recordRecoveryCheckpoint(improved, storage, new Date("2026-07-25T01:00:00.000Z"));

  assert.equal(history.length, 2);
  assert.ok(history[1].cashAvailable > history[0].cashAvailable);
  assert.deepEqual(readRecoveryHistory(storage), history);
});
