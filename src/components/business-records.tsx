"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { extractFieldsFromText, mergeImportDraft, readSmartImport, writeSmartImport, type DiagnosticSignal, type ImportedField } from "@/lib/mri-smart-import";
import type { BusinessData } from "@/lib/types";

type RecordCategory = "Financial" | "Tax" | "Payroll" | "Timesheets" | "Customers" | "Suppliers" | "Contracts" | "Operations" | "Other";
type RecordStatus = "uploaded" | "verified" | "needs-review";
type ReaderStatus = "local" | "ai-read" | "registered" | "failed";

type BusinessRecord = {
  id: string;
  name: string;
  size: number;
  fileType: string;
  category: RecordCategory;
  status: RecordStatus;
  uploadedAt: string;
  extractedCount?: number;
  signalCount?: number;
  readerStatus?: ReaderStatus;
  readerMessage?: string;
};

type ReaderExtraction = {
  fields: Array<{ key: keyof BusinessData; value: number | string; confidence: "high" | "review"; evidence: string }>;
  reportingPeriod: string;
  documentType: string;
  diagnosticSignals: Array<Omit<DiagnosticSignal, "source">>;
  warnings: string[];
};

const STORAGE_KEY = "business-lifeline-records-v1";
const acceptedTypes = ".pdf,.csv,.xlsx,.xls,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,image/*";
const categoryOptions: RecordCategory[] = ["Financial", "Tax", "Payroll", "Timesheets", "Customers", "Suppliers", "Contracts", "Operations", "Other"];

function inferCategory(name: string): RecordCategory {
  const lower = name.toLowerCase();
  if (lower.includes("profit") || lower.includes("loss") || lower.includes("p&l") || lower.includes("balance") || lower.includes("cashflow") || lower.includes("cash-flow")) return "Financial";
  if (lower.includes("tax") || lower.includes("bas") || lower.includes("ato") || lower.includes("gst")) return "Tax";
  if (lower.includes("payroll") || lower.includes("payslip") || lower.includes("wage")) return "Payroll";
  if (lower.includes("timesheet") || lower.includes("hours") || lower.includes("sinc")) return "Timesheets";
  if (lower.includes("customer") || lower.includes("debtor") || lower.includes("invoice")) return "Customers";
  if (lower.includes("supplier") || lower.includes("creditor") || lower.includes("bill")) return "Suppliers";
  if (lower.includes("contract") || lower.includes("agreement")) return "Contracts";
  if (lower.includes("procedure") || lower.includes("policy") || lower.includes("operations")) return "Operations";
  return "Other";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readStored(): BusinessRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as BusinessRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function canReadDirectly(file: File) {
  const lower = file.name.toLowerCase();
  return file.type.includes("csv") || file.type.startsWith("text/") || lower.endsWith(".csv") || lower.endsWith(".txt");
}

async function readWithAi(file: File): Promise<ReaderExtraction> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/read-business-record", {
    method: "POST",
    headers: { "x-business-lifeline-ai-consent": "true" },
    body: form,
  });
  const result = await response.json() as { extraction?: ReaderExtraction; error?: string };
  if (!response.ok || !result.extraction) throw new Error(result.error || "Document reader failed.");
  return result.extraction;
}

export function BusinessRecords({ compact = false, aiEnabled = false }: { compact?: boolean; aiEnabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<BusinessRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [signalCount, setSignalCount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState("");

  useEffect(() => {
    const draft = readSmartImport();
    setRecords(readStored());
    setImportedCount(draft?.fields.length ?? 0);
    setSignalCount(draft?.signals?.length ?? 0);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records, ready]);

  const summary = useMemo(() => ({
    total: records.length,
    verified: records.filter((record) => record.status === "verified").length,
    review: records.filter((record) => record.status !== "verified").length,
  }), [records]);

  const addFiles = async (files: FileList | File[]) => {
    const selected = Array.from(files);
    if (selected.length === 0) return;
    setProcessing(true);
    const added: BusinessRecord[] = [];
    let draft = readSmartImport();

    for (const file of selected) {
      setProcessingLabel(`Reading ${file.name}…`);
      let extracted: ImportedField[] = [];
      let signals: DiagnosticSignal[] = [];
      let warnings: string[] = [];
      let readerStatus: ReaderStatus = "registered";
      let readerMessage = aiEnabled ? "No MRI-relevant facts found." : "Saved locally; AI reading was not selected.";

      if (canReadDirectly(file)) {
        try {
          const text = await file.text();
          extracted = extractFieldsFromText(text, file.name);
          if (extracted.length) {
            readerStatus = "local";
            readerMessage = `${extracted.length} field${extracted.length === 1 ? "" : "s"} read locally.`;
          }
        } catch {
          readerMessage = "The local text reader could not read this file.";
        }
      }

      if (aiEnabled) {
        try {
          const result = await readWithAi(file);
          extracted = result.fields.map((field) => ({ ...field, source: file.name, reportingPeriod: result.reportingPeriod }));
          signals = result.diagnosticSignals.map((signal) => ({ ...signal, source: file.name }));
          warnings = result.warnings.map((warning) => `${file.name}: ${warning}`);
          readerStatus = "ai-read";
          readerMessage = `${result.documentType || "Record"} read${result.reportingPeriod ? ` · ${result.reportingPeriod}` : ""}.`;
        } catch (error) {
          if (!extracted.length) readerStatus = "failed";
          readerMessage = error instanceof Error ? error.message : "The AI reader could not read this file.";
        }
      }

      if (extracted.length || signals.length || warnings.length) {
        draft = mergeImportDraft(draft, extracted, { signals, warnings });
        writeSmartImport(draft);
      }

      added.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        name: file.name,
        size: file.size,
        fileType: file.type || file.name.split(".").pop()?.toUpperCase() || "Unknown",
        category: inferCategory(file.name),
        status: extracted.length > 0 ? "uploaded" : "needs-review",
        uploadedAt: new Date().toISOString(),
        extractedCount: extracted.length,
        signalCount: signals.length,
        readerStatus,
        readerMessage,
      });
    }

    const nextRecords = [...added, ...readStored()];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    setRecords(nextRecords);
    setImportedCount(draft?.fields.length ?? 0);
    setSignalCount(draft?.signals?.length ?? 0);
    setProcessing(false);
    setProcessingLabel("");
  };

  const updateRecord = (id: string, updates: Partial<BusinessRecord>) => {
    setRecords((current) => current.map((record) => record.id === id ? { ...record, ...updates } : record));
  };

  if (compact) {
    return (
      <section className="records-mri-compact" aria-label="Upload records before the Business MRI">
        <input ref={inputRef} type="file" multiple accept={acceptedTypes} onChange={(event) => event.target.files && void addFiles(event.target.files)} hidden />
        <div>
          <p className="eyebrow">MAKE THE MRI EASIER</p>
          <h2>Upload the records you already have.</h2>
          <p>{aiEnabled ? "PDFs, spreadsheets, Word files, images, screenshots, CSV and text records can be read for MRI facts and business-health signals." : "CSV and text exports are read privately in this browser. Other files can be registered without being sent anywhere."}</p>
          <small>{aiEnabled ? "AI document reading sends the selected file to the AI provider under the consent above. Extracted values are never silently confirmed." : "Choose AI-enhanced above to read PDFs, spreadsheets, documents and images. Do not upload secrets, identity records or payment-card details."}</small>
        </div>
        <div className="records-mri-actions">
          <button type="button" className="button outline" disabled={processing} onClick={() => inputRef.current?.click()}>{processing ? processingLabel || "Reading files…" : "Upload business records"}</button>
          <span><strong>{importedCount}</strong> MRI field{importedCount === 1 ? "" : "s"} pre-filled</span>
          <span><strong>{signalCount}</strong> diagnostic signal{signalCount === 1 ? "" : "s"} found</span>
          <span><strong>{summary.total}</strong> file{summary.total === 1 ? "" : "s"} ready</span>
        </div>
      </section>
    );
  }

  return (
    <div className="records-shell">
      <section className="records-hero">
        <div><p className="eyebrow">BUSINESS RECORDS · UNIVERSAL READER</p><h1>Turn existing records into verified MRI inputs.</h1><p>Business Lifeline reads supported reports, spreadsheets, documents and images when AI document reading is enabled, while keeping every imported value linked to its source for confirmation.</p></div>
        <div className="records-summary" aria-label="Records summary"><span><strong>{summary.total}</strong><small>Files added</small></span><span><strong>{importedCount}</strong><small>MRI fields found</small></span><span><strong>{signalCount}</strong><small>Health signals</small></span></div>
      </section>

      <section className={`records-dropzone ${dragging ? "dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { event.preventDefault(); setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); void addFiles(event.dataTransfer.files); }}>
        <input ref={inputRef} type="file" multiple accept={acceptedTypes} onChange={(event) => event.target.files && void addFiles(event.target.files)} hidden />
        <div className="records-upload-icon" aria-hidden="true">↑</div><h2>Upload business records</h2><p>PDF, CSV, Excel, Word, text, screenshots and common image formats are accepted.</p><button type="button" className="button primary" disabled={processing} onClick={() => inputRef.current?.click()}>{processing ? processingLabel || "Reading files…" : "Choose files"}</button><small>Never upload passwords, banking credentials, tax file numbers, identity documents, payment-card details, customer personal data or privileged legal material.</small>
      </section>

      <section className="records-needed"><div><strong>Financial diagnosis</strong><span>P&amp;L · Balance sheet · Cashflow · Aged debtors · Aged creditors · Tax statements</span></div><div><strong>Operating diagnosis</strong><span>Payroll · Timesheets · Contracts · Job reports · Supplier records · Procedures · Compliance records</span></div></section>

      <section className="records-list" aria-label="Uploaded business records">
        <div className="records-list-heading"><div><p className="eyebrow">RECORD REGISTER</p><h2>Confirm every file and imported result.</h2></div>{records.length > 0 && <button type="button" className="button ghost" onClick={() => setRecords([])}>Clear register</button>}</div>
        {records.length === 0 ? <div className="records-empty"><strong>No records added yet.</strong><p>Upload a business report, spreadsheet, screenshot or document.</p></div> : records.map((record) => (
          <article key={record.id} className="record-card">
            <div className="record-main"><span className="record-file-badge">{record.name.split(".").pop()?.slice(0, 4).toUpperCase() || "FILE"}</span><div><strong>{record.name}</strong><small>{formatBytes(record.size)} · Added {new Date(record.uploadedAt).toLocaleString()} · {record.readerMessage || "Registered"}{record.extractedCount ? ` · ${record.extractedCount} MRI fields` : ""}{record.signalCount ? ` · ${record.signalCount} signals` : ""}</small></div></div>
            <label>Category<select value={record.category} onChange={(event) => updateRecord(record.id, { category: event.target.value as RecordCategory })}>{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>Status<select value={record.status} onChange={(event) => updateRecord(record.id, { status: event.target.value as RecordStatus })}><option value="needs-review">Needs review</option><option value="uploaded">Imported — confirm</option><option value="verified">Verified</option></select></label>
            <button type="button" className="record-remove" onClick={() => setRecords((current) => current.filter((item) => item.id !== record.id))} aria-label={`Remove ${record.name}`}>Remove</button>
          </article>
        ))}
      </section>

      <aside className="records-foundation-note"><strong>What “read” means</strong><p>The reader extracts only visible, MRI-relevant facts and supported health signals. It can still miss poor scans, unusual spreadsheets, encrypted files or unsupported formats. Every result remains marked for owner confirmation.</p></aside>
    </div>
  );
}
