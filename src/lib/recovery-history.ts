import type { SavedReport } from "./saved-report";

export const RECOVERY_HISTORY_KEY = "business-lifeline-recovery-history-v1";

export type RecoveryCheckpoint = {
  id: string;
  recordedAt: string;
  businessName: string;
  healthScore: number;
  monthlyResult: number;
  runwayMonths: number | null;
  cashAvailable: number;
  overdueObligations: number;
};

const isCheckpoint = (value: unknown): value is RecoveryCheckpoint => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" &&
    typeof item.recordedAt === "string" &&
    typeof item.businessName === "string" &&
    typeof item.healthScore === "number" && Number.isFinite(item.healthScore) &&
    typeof item.monthlyResult === "number" && Number.isFinite(item.monthlyResult) &&
    (item.runwayMonths === null || (typeof item.runwayMonths === "number" && Number.isFinite(item.runwayMonths))) &&
    typeof item.cashAvailable === "number" && Number.isFinite(item.cashAvailable) &&
    typeof item.overdueObligations === "number" && Number.isFinite(item.overdueObligations);
};

export function readRecoveryHistory(storage: Storage = window.localStorage): RecoveryCheckpoint[] {
  try {
    const raw = storage.getItem(RECOVERY_HISTORY_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(isCheckpoint).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  } catch {
    return [];
  }
}

export function checkpointFromReport(saved: SavedReport, now = new Date()): RecoveryCheckpoint {
  const { data, report } = saved;
  const signature = [
    data.businessName.trim().toLowerCase(),
    report.metrics.overallScore,
    report.metrics.monthlyOperatingResult,
    report.metrics.runwayMonths ?? "positive",
    data.cashAvailable,
    data.overdueTax + data.overdueSuppliers,
  ].join("|");

  return {
    id: `${now.toISOString()}|${signature}`,
    recordedAt: now.toISOString(),
    businessName: data.businessName,
    healthScore: report.metrics.overallScore,
    monthlyResult: report.metrics.monthlyOperatingResult,
    runwayMonths: report.metrics.runwayMonths,
    cashAvailable: data.cashAvailable,
    overdueObligations: data.overdueTax + data.overdueSuppliers,
  };
}

export function recordRecoveryCheckpoint(saved: SavedReport, storage: Storage = window.localStorage, now = new Date()): RecoveryCheckpoint[] {
  const current = readRecoveryHistory(storage);
  const next = checkpointFromReport(saved, now);
  const latest = current.at(-1);

  const unchanged = latest &&
    latest.businessName.trim().toLowerCase() === next.businessName.trim().toLowerCase() &&
    latest.healthScore === next.healthScore &&
    latest.monthlyResult === next.monthlyResult &&
    latest.runwayMonths === next.runwayMonths &&
    latest.cashAvailable === next.cashAvailable &&
    latest.overdueObligations === next.overdueObligations;

  if (unchanged) return current;

  const updated = [...current, next].slice(-24);
  storage.setItem(RECOVERY_HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

export function clearRecoveryHistory(storage: Storage = window.localStorage) {
  storage.removeItem(RECOVERY_HISTORY_KEY);
}
