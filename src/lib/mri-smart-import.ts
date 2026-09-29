import { emptyBusiness } from "@/lib/demo";
import type { BusinessData } from "@/lib/types";

export const MRI_IMPORT_KEY = "business-lifeline-mri-smart-import-v1";

export type ImportedField = {
  key: keyof BusinessData;
  value: number | string;
  source: string;
  confidence: "high" | "review";
  evidence?: string;
  reportingPeriod?: string;
};

export type DiagnosticSignal = {
  area: "cash" | "profitability" | "debt" | "tax" | "customers" | "suppliers" | "people" | "operations" | "compliance" | "growth" | "other";
  signal: string;
  severity: "information" | "watch" | "urgent";
  evidence: string;
  source: string;
};

export type ImportConflict = {
  key: keyof BusinessData;
  selected: ImportedField;
  alternatives: ImportedField[];
  reason: string;
};

export type SmartImportDraft = {
  fields: ImportedField[];
  conflicts?: ImportConflict[];
  signals?: DiagnosticSignal[];
  warnings?: string[];
  updatedAt: string;
};

const comparable = (value: number | string) => typeof value === "number" ? value : value.trim().toLowerCase();
const materiallyDifferent = (a: ImportedField, b: ImportedField) => {
  const av = comparable(a.value);
  const bv = comparable(b.value);
  if (typeof av === "number" && typeof bv === "number") {
    const scale = Math.max(1, Math.abs(av), Math.abs(bv));
    return Math.abs(av - bv) / scale > 0.02;
  }
  return av !== bv;
};

function choosePreferred(a: ImportedField, b: ImportedField) {
  if (a.confidence !== b.confidence) return b.confidence === "high" ? b : a;
  if (Boolean(a.reportingPeriod) !== Boolean(b.reportingPeriod)) return b.reportingPeriod ? b : a;
  return b;
}

export function evidenceStatus(draft: SmartImportDraft | null, key: keyof BusinessData): "missing" | "confirmed" | "review" | "conflict" {
  if (draft?.conflicts?.some((conflict) => conflict.key === key)) return "conflict";
  const field = draft?.fields.find((item) => item.key === key);
  if (!field) return "missing";
  return field.confidence === "high" ? "confirmed" : "review";
}

const aliases: Array<{ key: keyof BusinessData; labels: string[] }> = [
  { key: "monthlyRevenue", labels: ["monthly revenue", "total income", "total revenue", "sales", "turnover", "income"] },
  { key: "fixedExpenses", labels: ["fixed expenses", "fixed costs", "overheads", "operating expenses"] },
  { key: "variableExpenses", labels: ["variable expenses", "variable costs", "cost of sales", "cost of goods sold", "cogs"] },
  { key: "ownerDrawings", labels: ["owner drawings", "drawings", "director drawings"] },
  { key: "loanRepayments", labels: ["loan repayments", "loan payments", "finance repayments"] },
  { key: "cashAvailable", labels: ["cash available", "cash at bank", "bank balance", "cash balance", "cash and cash equivalents"] },
  { key: "accountsReceivable", labels: ["accounts receivable", "trade debtors", "debtors", "amounts receivable"] },
  { key: "overdueInvoices", labels: ["overdue invoices", "overdue debtors", "past due receivables"] },
  { key: "totalDebt", labels: ["total debt", "total liabilities", "borrowings", "loans payable"] },
  { key: "overdueTax", labels: ["overdue tax", "tax payable", "ato debt", "gst payable", "bas payable"] },
  { key: "overdueSuppliers", labels: ["overdue suppliers", "overdue creditors", "past due payables", "trade creditors"] },
  { key: "employees", labels: ["employees", "employee count", "headcount", "staff count"] },
];

function cleanNumber(value: string): number | null {
  const negative = /\(|-$/.test(value.trim());
  const cleaned = value.replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "." || cleaned === "-") return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.abs(parsed) * (negative ? -1 : 1);
}

function findValue(lines: string[], labels: string[]): { value: number; confidence: "high" | "review"; evidence: string } | null {
  for (const line of lines) {
    const lower = line.toLowerCase();
    const label = labels.find((candidate) => lower.includes(candidate));
    if (!label) continue;
    const afterLabel = line.slice(lower.indexOf(label) + label.length);
    const numbers = afterLabel.match(/\(?-?\$?\s*[\d,]+(?:\.\d+)?\)?/g) ?? line.match(/\(?-?\$?\s*[\d,]+(?:\.\d+)?\)?/g) ?? [];
    const parsed = numbers.map(cleanNumber).filter((value): value is number => value !== null);
    if (parsed.length) return { value: parsed[parsed.length - 1], confidence: numbers.length === 1 ? "high" : "review", evidence: line.slice(0, 240) };
  }
  return null;
}

export function extractFieldsFromText(text: string, source: string): ImportedField[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const fields: ImportedField[] = [];
  for (const alias of aliases) {
    const found = findValue(lines, alias.labels);
    if (!found) continue;
    fields.push({ key: alias.key, value: found.value, source, confidence: found.confidence, evidence: found.evidence });
  }
  return fields;
}

export function mergeImportDraft(existing: SmartImportDraft | null, incoming: ImportedField[], additions?: { signals?: DiagnosticSignal[]; warnings?: string[] }): SmartImportDraft {
  const map = new Map<keyof BusinessData, ImportedField>();
  const conflictMap = new Map<keyof BusinessData, ImportConflict>();
  for (const field of existing?.fields ?? []) map.set(field.key, field);
  for (const conflict of existing?.conflicts ?? []) conflictMap.set(conflict.key, conflict);
  for (const field of incoming) {
    const current = map.get(field.key);
    if (!current) { map.set(field.key, field); continue; }
    if (!materiallyDifferent(current, field)) {
      map.set(field.key, choosePreferred(current, field));
      continue;
    }
    const selected = choosePreferred(current, field);
    const prior = conflictMap.get(field.key);
    const alternatives = [...(prior?.alternatives ?? []), current, field]
      .filter((candidate, index, all) => all.findIndex((other) => other.source === candidate.source && comparable(other.value) === comparable(candidate.value)) === index)
      .filter((candidate) => !(candidate.source === selected.source && comparable(candidate.value) === comparable(selected.value)));
    conflictMap.set(field.key, {
      key: field.key,
      selected,
      alternatives,
      reason: "Sources disagree materially. Confirm the correct value before relying on the MRI.",
    });
    map.set(field.key, selected);
  }
  const signalMap = new Map<string, DiagnosticSignal>();
  for (const signal of existing?.signals ?? []) signalMap.set(`${signal.source}:${signal.area}:${signal.signal}`, signal);
  for (const signal of additions?.signals ?? []) signalMap.set(`${signal.source}:${signal.area}:${signal.signal}`, signal);
  return {
    fields: [...map.values()],
    conflicts: [...conflictMap.values()],
    signals: [...signalMap.values()],
    warnings: [...new Set([...(existing?.warnings ?? []), ...(additions?.warnings ?? [])])].slice(0, 20),
    updatedAt: new Date().toISOString(),
  };
}

export function readSmartImport(): SmartImportDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(MRI_IMPORT_KEY) ?? "null") as SmartImportDraft | null;
    return parsed && Array.isArray(parsed.fields) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeSmartImport(draft: SmartImportDraft) {
  window.localStorage.setItem(MRI_IMPORT_KEY, JSON.stringify(draft));
  const importedData = draft.fields.reduce<Partial<BusinessData>>((values, field) => {
    (values as Record<string, unknown>)[String(field.key)] = field.value;
    return values;
  }, {});
  window.localStorage.setItem("business-lifeline-mri-v2", JSON.stringify({
    data: { ...emptyBusiness, ...importedData },
    report: null,
    importedFields: draft.fields,
    diagnosticSignals: draft.signals ?? [],
    importWarnings: draft.warnings ?? [],
    importConflicts: draft.conflicts ?? [],
  }));
}
