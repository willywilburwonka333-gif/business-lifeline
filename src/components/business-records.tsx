"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
};

const STORAGE_KEY = "business-lifeline-records-v1";
const acceptedTypes = ".pdf,.csv,.xlsx,.xls,.doc,.docx,.txt,image/*";

const categoryOptions: RecordCategory[] = [
  "Financial",
  "Tax",
  "Payroll",
  "Timesheets",
  "Customers",
  "Suppliers",
  "Contracts",
  "Operations",
  "Other",
];

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

export function BusinessRecords({ compact = false }: { compact?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<BusinessRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setRecords(readStored());
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

  const addFiles = (files: FileList | File[]) => {
    const next = Array.from(files).map((file): BusinessRecord => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      name: file.name,
      size: file.size,
      fileType: file.type || file.name.split(".").pop()?.toUpperCase() || "Unknown",
      category: inferCategory(file.name),
      status: "needs-review",
      uploadedAt: new Date().toISOString(),
    }));
    setRecords((current) => [...next, ...current]);
  };

  const updateRecord = (id: string, updates: Partial<BusinessRecord>) => {
    setRecords((current) => current.map((record) => record.id === id ? { ...record, ...updates } : record));
  };

  if (compact) {
    return (
      <section className="records-mri-compact" aria-label="Upload records before the Business MRI">
        <input ref={inputRef} type="file" multiple accept={acceptedTypes} onChange={(event) => event.target.files && addFiles(event.target.files)} hidden />
        <div>
          <p className="eyebrow">MAKE THE MRI EASIER</p>
          <h2>Already have reports? Add them before you begin.</h2>
          <p>Upload a P&amp;L, balance sheet, debtors, creditors, payroll or timesheet export so the information is ready in your Business Lifeline record register.</p>
          <small>This foundation records the files now. Automatic reading and pre-filling of MRI figures is the next build.</small>
        </div>
        <div className="records-mri-actions">
          <button type="button" className="button outline" onClick={() => inputRef.current?.click()}>Upload business records</button>
          <span><strong>{summary.total}</strong> file{summary.total === 1 ? "" : "s"} ready</span>
        </div>
      </section>
    );
  }

  return (
    <div className="records-shell">
      <section className="records-hero">
        <div>
          <p className="eyebrow">BUSINESS RECORDS · UPLOAD FOUNDATION</p>
          <h1>Bring existing business information into one place.</h1>
          <p>Upload reports and exports you already use instead of retyping everything. This foundation records the file, category and verification status privately in this browser.</p>
        </div>
        <div className="records-summary" aria-label="Records summary">
          <span><strong>{summary.total}</strong><small>Files added</small></span>
          <span><strong>{summary.verified}</strong><small>Verified</small></span>
          <span><strong>{summary.review}</strong><small>Need review</small></span>
        </div>
      </section>

      <section
        className={`records-dropzone ${dragging ? "dragging" : ""}`}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
        onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
      >
        <input ref={inputRef} type="file" multiple accept={acceptedTypes} onChange={(event) => event.target.files && addFiles(event.target.files)} hidden />
        <div className="records-upload-icon" aria-hidden="true">↑</div>
        <h2>Upload reports, exports and documents</h2>
        <p>PDF, CSV, Excel, Word, text and images are accepted.</p>
        <button type="button" className="button primary" onClick={() => inputRef.current?.click()}>Choose files</button>
        <small>Do not upload passwords, banking credentials, tax file numbers, payment-card details or identity documents.</small>
      </section>

      <section className="records-needed">
        <div><strong>Best files to add first</strong><span>Profit &amp; loss · Balance sheet · Aged debtors · Aged creditors</span></div>
        <div><strong>Then add</strong><span>Payroll summary · Timesheet export · Tax statements · Major contracts</span></div>
      </section>

      <section className="records-list" aria-label="Uploaded business records">
        <div className="records-list-heading">
          <div><p className="eyebrow">RECORD REGISTER</p><h2>Confirm what each file is before the MRI uses it.</h2></div>
          {records.length > 0 && <button type="button" className="button ghost" onClick={() => setRecords([])}>Clear all</button>}
        </div>

        {records.length === 0 ? (
          <div className="records-empty"><strong>No records added yet.</strong><p>Upload one test PDF or CSV to check the new workflow.</p></div>
        ) : records.map((record) => (
          <article key={record.id} className="record-card">
            <div className="record-main">
              <span className="record-file-badge">{record.name.split(".").pop()?.slice(0, 4).toUpperCase() || "FILE"}</span>
              <div><strong>{record.name}</strong><small>{formatBytes(record.size)} · Added {new Date(record.uploadedAt).toLocaleString()}</small></div>
            </div>
            <label>Category<select value={record.category} onChange={(event) => updateRecord(record.id, { category: event.target.value as RecordCategory })}>{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>Status<select value={record.status} onChange={(event) => updateRecord(record.id, { status: event.target.value as RecordStatus })}><option value="needs-review">Needs review</option><option value="uploaded">Uploaded</option><option value="verified">Verified</option></select></label>
            <button type="button" className="record-remove" onClick={() => setRecords((current) => current.filter((item) => item.id !== record.id))} aria-label={`Remove ${record.name}`}>Remove</button>
          </article>
        ))}
      </section>

      <aside className="records-foundation-note">
        <strong>What this stage does now</strong>
        <p>It proves the upload, categorisation, verification and local record-register flow. Automatic reading and figure extraction from PDFs, CSVs and spreadsheets comes in the next records stage.</p>
      </aside>
    </div>
  );
}
