import { emptyBusiness } from "@/lib/demo";
import type { BusinessData } from "@/lib/types";

export const MRI_IMPORT_KEY = "business-lifeline-mri-smart-import-v1";

export type ImportedField = {
  key: keyof BusinessData;
  value: number | string;
  source: string;
  confidence: "high" | "review";
};

export type SmartImportDraft = {
  fields: ImportedField[];
  updatedAt: string;
};

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

function findValue(lines: string[], labels: string[]): { value: number; confidence: "high" | "review" } | null {
  for (const line of lines) {
    const lower = line.toLowerCase();
    const label = labels.find((candidate) => lower.includes(candidate));
    if (!label) continue;
    const afterLabel = line.slice(lower.indexOf(label) + label.length);
    const numbers = afterLabel.match(/\(?-?\$?\s*[\d,]+(?:\.\d+)?\)?/g) ?? line.match(/\(?-?\$?\s*[\d,]+(?:\.\d+)?\)?/g) ?? [];
    const parsed = numbers.map(cleanNumber).filter((value): value is number => value !== null);
    if (parsed.length) return { value: parsed[parsed.length - 1], confidence: numbers.length === 1 ? "high" : "review" };
  }
  return null;
}

export function extractFieldsFromText(text: string, source: string): ImportedField[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const fields: ImportedField[] = [];
  for (const alias of aliases) {
    const found = findValue(lines, alias.labels);
    if (!found) continue;
    fields.push({ key: alias.key, value: found.value, source, confidence: found.confidence });
  }
  return fields;
}

export function mergeImportDraft(existing: SmartImportDraft | null, incoming: ImportedField[]): SmartImportDraft {
  const map = new Map<keyof BusinessData, ImportedField>();
  for (const field of existing?.fields ?? []) map.set(field.key, field);
  for (const field of incoming) map.set(field.key, field);
  return { fields: [...map.values()], updatedAt: new Date().toISOString() };
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
  }));
}
