import type { BusinessData, BusinessReport, HealthMetrics, PlanAction } from "./types";

export const REPORT_STORAGE_KEY = "business-lifeline-mri-v2";

export type SavedReport = {
  data: BusinessData;
  report: BusinessReport;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isPlanAction = (value: unknown): value is PlanAction => {
  if (!isRecord(value)) return false;
  return (
    typeof value.title === "string" &&
    ["Critical", "High", "Medium"].includes(String(value.urgency)) &&
    ["High", "Medium"].includes(String(value.impact)) &&
    ["Easy", "Moderate", "Hard"].includes(String(value.difficulty)) &&
    typeof value.reason === "string"
  );
};

const isActionArray = (value: unknown): value is PlanAction[] =>
  Array.isArray(value) && value.every(isPlanAction);

const isBusinessData = (value: unknown): value is BusinessData => {
  if (!isRecord(value)) return false;
  const stringFields = ["businessName", "industry", "country", "biggestProblem", "immediateGoal"];
  const numberFields = [
    "yearsOperating", "employees", "monthlyRevenue", "fixedExpenses", "variableExpenses",
    "ownerDrawings", "loanRepayments", "cashAvailable", "accountsReceivable", "overdueInvoices",
    "totalDebt", "overdueTax", "overdueSuppliers",
  ];
  return (
    stringFields.every((key) => typeof value[key] === "string") &&
    numberFields.every((key) => isFiniteNumber(value[key]) && Number(value[key]) >= 0) &&
    ["growing", "stable", "declining", "volatile"].includes(String(value.revenueTrend)) &&
    isStringArray(value.urgentConcerns)
  );
};

const isMetrics = (value: unknown): value is HealthMetrics => {
  if (!isRecord(value)) return false;
  const required = [
    "monthlyOperatingResult", "operatingMargin", "expenseRatio", "debtPressure",
    "receivablesPressure", "revenueStability", "cashFlowScore", "runwayScore",
    "debtScore", "revenueScore", "overallScore",
  ];
  return required.every((key) => isFiniteNumber(value[key])) &&
    (value.runwayMonths === null || isFiniteNumber(value.runwayMonths));
};

const isBusinessReport = (value: unknown): value is BusinessReport => {
  if (!isRecord(value)) return false;
  return (
    isMetrics(value.metrics) &&
    isStringArray(value.warnings) &&
    isStringArray(value.strengths) &&
    isStringArray(value.risks) &&
    typeof value.urgentHelp === "boolean" &&
    isActionArray(value.today) &&
    isActionArray(value.sevenDays) &&
    isActionArray(value.thirtyDays) &&
    isActionArray(value.ninetyDays)
  );
};

export function parseSavedReport(raw: string | null): SavedReport | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || !isBusinessData(value.data) || !isBusinessReport(value.report)) return null;
    return { data: value.data, report: value.report };
  } catch {
    return null;
  }
}

export function readSavedReport(storage: Storage = window.localStorage): SavedReport | null {
  const raw = storage.getItem(REPORT_STORAGE_KEY);
  const saved = parseSavedReport(raw);
  if (raw && !saved) storage.removeItem(REPORT_STORAGE_KEY);
  return saved;
}

export function writeSavedReport(saved: SavedReport, storage: Storage = window.localStorage) {
  storage.setItem(REPORT_STORAGE_KEY, JSON.stringify(saved));
}
