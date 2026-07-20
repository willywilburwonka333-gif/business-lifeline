"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { extractFieldsFromText, mergeImportDraft, readSmartImport, writeSmartImport } from "@/lib/mri-smart-import";

type RecordCategory = "Financial" | "Tax" | "Payroll" | "Timesheets" | "Customers" | "Suppliers" | "Contracts" | "Operations" | "Other";
type RecordStatus = "uploaded" | "verified" | "needs-review";

type BusinessRecord = {
  id: string;
  name: string;
  size: number;
  fileType: string;
  category: RecordCategory;
  status: RecordStatus;
  uploadedAt: string;
  extractedCount?: number;
};

const STORAGE_KEY = "business-lifeline-records-v1";
const acceptedTypes = ".pdf,.csv,.xlsx,.xls,.doc,.docx,.txt,image/*";
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

export function BusinessRecords({ compact = false, onUploadComplete }: { compact?: boolean; onUploadComplete?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<BusinessRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setRecords(readStored());
    setImportedCount(readSmartImport()?.fields.length ?? 0);
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
      let extractedCount = 0;
      if (canReadDirectly(file)) {
        try {
          const text = await file.text();
          const extracted = extractFieldsFromText(text, file.name);
          extractedCount = extracted.length;
          if (extracted.length) {
            draft = mergeImportDraft(draft, extracted);
            writeSmartImport(draft);
          }
        } catch {
          extractedCount = 0;
        }
      }

      added.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        name: file.name,
        size: file.size,
        fileType: file.type || file.name.split(".").pop()?.toUpperCase() || "Unknown",
        category: inferCategory(file.name),
        status: extractedCount > 0 ? "uploaded" : "needs-review",
        uploadedAt: new Date().toISOString(),
        extractedCount,
      });
    }

    const nextRecords = [...added, ...readStored()];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    setRecords(nextRecords);
    setImportedCount(draft?.fields.length ?? 0);
    setProcessing(false);

    if (compact) onUploadComplete?.();
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
          <h2>Upload your reports and go straight into the MRI.</h2>
          <p>CSV and text exports are read privately in this browser. Any figures found are pre-filled for you to double-check on the MRI questions.</p>
          <small>After the upload finishes, Business Lifeline opens the first MRI step automatically.</small>
        </div>
        <div className="records-mri-actions">
          <button type="button" className="button outline" disabled={processing} onClick={() => inputRef.current?.click()}>{processing ? "Reading files…" : "Upload records and continue"}</button>
          <span><strong>{importedCount}</strong> MRI field{importedCount === 1 ? "" : "s"} pre-filled</span>
          <span><strong>{summary.total}</strong> file{summary.total === 1 ? "" : "s"} ready</span>
        </div>
      </section>
    );
  }

  return (
    <div className="records-shell">
      <section className="records-hero">
        <div><p className="eyebrow">BUSINESS RECORDS · SMART IMPORT</p><h1>Bring existing business information into one place.</h1><p>CSV and text exports can now pre-fill MRI figures. Other supported files remain safely listed for the document-reader stage.</p></div>
        <div className="records-summary" aria-label="Records summary"><span><strong>{summary.total}</strong><small>Files added</small></span><span><strong>{importedCount}</strong><small>MRI fields found</small></span><span><strong>{summary.review}</strong><small>Need review</small></span></div>
      </section>

      <section className={`records-dropzone ${dragging ? "dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { event.preventDefault(); setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); void addFiles(event.dataTransfer.files); }}>
        <input ref={inputRef} type="file" multiple accept={acceptedTypes} onChange={(event) => event.target.files && void addFiles(event.target.files)} hidden />
        <div className="records-upload-icon" aria-hidden="true">↑</div><h2>Upload reports, exports and documents</h2><p>CSV and text are read now. PDF, Excel, Word and images are registered for later reading.</p><button type="button" className="button primary" disabled={processing} onClick={() => inputRef.current?.click()}>{processing ? "Reading files…" : "Choose files"}</button><small>Do not upload passwords, banking credentials, tax file numbers, payment-card details or identity documents.</small>
      </section>

      <section className="records-needed"><div><strong>Best files to add first</strong><span>Profit &amp; loss CSV · Balance sheet CSV · Aged debtors CSV · Aged creditors CSV</span></div><div><strong>Then add</strong><span>Payroll summary · Timesheet export · Tax statements · Major contracts</span></div></section>

      <section className="records-list" aria-label="Uploaded business records">
        <div className="records-list-heading"><div><p className="eyebrow">RECORD REGISTER</p><h2>Confirm each file and every imported figure.</h2></div>{records.length > 0 && <button type="button" className="button ghost" onClick={() => setRecords([])}>Clear register</button>}</div>
        {records.length === 0 ? <div className="records-empty"><strong>No records added yet.</strong><p>Upload a test CSV containing labelled financial figures.</p></div> : records.map((record) => (
          <article key={record.id} className="record-card">
            <div className="record-main"><span className="record-file-badge">{record.name.split(".").pop()?.slice(0, 4).toUpperCase() || "FILE"}</span><div><strong>{record.name}</strong><small>{formatBytes(record.size)} · Added {new Date(record.uploadedAt).toLocaleString()}{record.extractedCount ? ` · ${record.extractedCount} MRI fields found` : " · No automatic figures found"}</small></div></div>
            <label>Category<select value={record.category} onChange={(event) => updateRecord(record.id, { category: event.target.value as RecordCategory })}>{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>Status<select value={record.status} onChange={(event) => updateRecord(record.id, { status: event.target.value as RecordStatus })}><option value="needs-review">Needs review</option><option value="uploaded">Imported — confirm</option><option value="verified">Verified</option></select></label>
            <button type="button" className="record-remove" onClick={() => setRecords((current) => current.filter((item) => item.id !== record.id))} aria-label={`Remove ${record.name}`}>Remove</button>
          </article>
        ))}
      </section>

      <aside className="records-foundation-note"><strong>Current smart-import coverage</strong><p>CSV and plain-text reports with recognisable labels can pre-fill MRI fields. The app never silently confirms imported values. PDF, image, Word and native Excel extraction will be added through the secure document-reader stage.</p></aside>
    </div>
  );
}
