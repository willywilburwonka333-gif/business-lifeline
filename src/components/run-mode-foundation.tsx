"use client";

import { useEffect, useMemo, useState } from "react";
import type { SavedReport } from "@/lib/saved-report";

type RunItem = {
  id: string;
  title: string;
  detail: string;
  status: "active" | "attention" | "done";
};

type WeeklyCheckIn = {
  cashAvailable: string;
  salesReceived: string;
  overdueInvoices: string;
  billsDue: string;
  ownerCapacity: "good" | "stretched" | "critical";
  biggestIssue: string;
  updatedAt: string;
};

const STORAGE_KEY = "business-lifeline-run-mode-v1";

const defaultItems: RunItem[] = [
  { id: "customer-1", title: "Key customers", detail: "Add major customers and follow-up dates.", status: "attention" },
  { id: "job-1", title: "Active jobs", detail: "Track delivery, cost and payment risk.", status: "active" },
  { id: "team-1", title: "Team responsibilities", detail: "Keep every critical action owned.", status: "active" },
  { id: "obligation-1", title: "Upcoming obligations", detail: "Record tax, supplier, licence and insurance deadlines.", status: "attention" },
];

function readStored(): { items: RunItem[]; checkIn: WeeklyCheckIn | null } {
  if (typeof window === "undefined") return { items: defaultItems, checkIn: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: defaultItems, checkIn: null };
    const parsed = JSON.parse(raw) as { items?: RunItem[]; checkIn?: WeeklyCheckIn | null };
    return {
      items: Array.isArray(parsed.items) ? parsed.items : defaultItems,
      checkIn: parsed.checkIn ?? null,
    };
  } catch {
    return { items: defaultItems, checkIn: null };
  }
}

export function RunModeFoundation({ saved }: { saved: SavedReport }) {
  const [items, setItems] = useState<RunItem[]>(defaultItems);
  const [checkIn, setCheckIn] = useState<WeeklyCheckIn | null>(null);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState<Omit<WeeklyCheckIn, "updatedAt">>({
    cashAvailable: "",
    salesReceived: "",
    overdueInvoices: "",
    billsDue: "",
    ownerCapacity: "good",
    biggestIssue: "",
  });

  useEffect(() => {
    const stored = readStored();
    setItems(stored.items);
    setCheckIn(stored.checkIn);
    if (stored.checkIn) {
      setForm({
        cashAvailable: stored.checkIn.cashAvailable,
        salesReceived: stored.checkIn.salesReceived,
        overdueInvoices: stored.checkIn.overdueInvoices,
        billsDue: stored.checkIn.billsDue,
        ownerCapacity: stored.checkIn.ownerCapacity,
        biggestIssue: stored.checkIn.biggestIssue,
      });
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, checkIn }));
  }, [items, checkIn, ready]);

  const attentionCount = useMemo(() => items.filter((item) => item.status === "attention").length, [items]);
  const completedCount = useMemo(() => items.filter((item) => item.status === "done").length, [items]);

  const saveCheckIn = () => {
    setCheckIn({ ...form, updatedAt: new Date().toISOString() });
  };

  const cycleStatus = (id: string) => {
    setItems((current) => current.map((item) => {
      if (item.id !== id) return item;
      const status = item.status === "attention" ? "active" : item.status === "active" ? "done" : "attention";
      return { ...item, status };
    }));
  };

  return (
    <div className="run-mode-shell">
      <section className="run-mode-hero">
        <div>
          <p className="eyebrow">RUN MODE · OPERATING FOUNDATION</p>
          <h1>Keep {saved.data.businessName} healthy after recovery.</h1>
          <p>Business Lifeline now stays with the business beyond the rescue plan—tracking weekly pressure, responsibilities, jobs, customers and obligations in one operating workspace.</p>
        </div>
        <div className="run-mode-scorecard" aria-label="Run mode summary">
          <span><strong>{saved.report.healthScore}</strong><small>MRI health score</small></span>
          <span><strong>{attentionCount}</strong><small>Needs attention</small></span>
          <span><strong>{completedCount}</strong><small>Controls completed</small></span>
        </div>
      </section>

      <section className="run-mode-grid" aria-label="Operating controls">
        {items.map((item) => (
          <button type="button" key={item.id} className={`run-mode-card ${item.status}`} onClick={() => cycleStatus(item.id)}>
            <span className="run-mode-status">{item.status === "done" ? "Complete" : item.status === "attention" ? "Needs attention" : "Active"}</span>
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
            <small>Tap to update status</small>
          </button>
        ))}
      </section>

      <section className="run-mode-checkin">
        <div className="run-mode-checkin-heading">
          <div>
            <p className="eyebrow">WEEKLY BUSINESS CHECK-IN</p>
            <h2>Update the signals that warn you before another crisis.</h2>
          </div>
          {checkIn && <small>Last updated {new Date(checkIn.updatedAt).toLocaleString()}</small>}
        </div>

        <div className="run-mode-form-grid">
          <label>Available cash<input inputMode="decimal" value={form.cashAvailable} onChange={(event) => setForm({ ...form, cashAvailable: event.target.value })} placeholder="$0" /></label>
          <label>Sales received this week<input inputMode="decimal" value={form.salesReceived} onChange={(event) => setForm({ ...form, salesReceived: event.target.value })} placeholder="$0" /></label>
          <label>Overdue invoices<input inputMode="decimal" value={form.overdueInvoices} onChange={(event) => setForm({ ...form, overdueInvoices: event.target.value })} placeholder="$0" /></label>
          <label>Bills due soon<input inputMode="decimal" value={form.billsDue} onChange={(event) => setForm({ ...form, billsDue: event.target.value })} placeholder="$0" /></label>
          <label>Owner capacity<select value={form.ownerCapacity} onChange={(event) => setForm({ ...form, ownerCapacity: event.target.value as WeeklyCheckIn["ownerCapacity"] })}><option value="good">Good</option><option value="stretched">Stretched</option><option value="critical">Critical</option></select></label>
          <label className="run-mode-wide">Biggest issue this week<textarea value={form.biggestIssue} onChange={(event) => setForm({ ...form, biggestIssue: event.target.value })} placeholder="What could disrupt cash, customers, staff or delivery?" /></label>
        </div>

        <div className="run-mode-actions">
          <p>Stored privately in this browser for this foundation release.</p>
          <button type="button" className="button primary" onClick={saveCheckIn}>Save weekly check-in <span>→</span></button>
        </div>
      </section>
    </div>
  );
}
