import { evidenceStatus, mergeImportDraft, type ImportedField } from "./mri-smart-import";

const field = (value: number, source: string, confidence: "high" | "review" = "high"): ImportedField => ({
  key: "monthlyRevenue", value, source, confidence,
});

export function runMriSmartImportAudit() {
  const first = mergeImportDraft(null, [field(10000, "pnl.pdf")]);
  if (evidenceStatus(first, "monthlyRevenue") !== "confirmed") throw new Error("High-confidence evidence should be confirmed.");

  const same = mergeImportDraft(first, [field(10100, "quickbooks")]);
  if ((same.conflicts ?? []).length) throw new Error("Small rounding differences should not create a conflict.");

  const conflict = mergeImportDraft(same, [field(15000, "bank-export.csv")]);
  if (evidenceStatus(conflict, "monthlyRevenue") !== "conflict") throw new Error("Materially different sources must create a conflict.");
  if (conflict.conflicts?.[0]?.alternatives.length !== 1) throw new Error("Conflict must retain the alternative evidence.");

  const preferred = mergeImportDraft(null, [field(9000, "ocr.png", "review"), field(12000, "quickbooks", "high")]);
  if (preferred.fields[0]?.value !== 12000) throw new Error("High-confidence evidence must be preferred over review evidence.");
}

runMriSmartImportAudit();
