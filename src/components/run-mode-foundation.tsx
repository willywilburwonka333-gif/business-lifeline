"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { SavedReport } from "@/lib/saved-report";

type RunView = "overview" | "customers" | "work" | "tasks" | "money" | "team" | "compliance";
type Status = "attention" | "active" | "done";
type OperatingItem = { id: string; title: string; detail: string; due: string; owner: string; value: string; status: Status };
type RunStore = { customers: OperatingItem[]; work: OperatingItem[]; tasks: OperatingItem[]; money: OperatingItem[]; team: OperatingItem[]; compliance: OperatingItem[]; checkIn: WeeklyCheckIn | null };
type WeeklyCheckIn = { cashAvailable: string; salesReceived: string; overdueInvoices: string; billsDue: string; ownerCapacity: "good" | "stretched" | "critical"; biggestIssue: string; updatedAt: string };

const STORAGE_KEY = "business-lifeline-run-operating-core-v1";
const views: Array<{ id: RunView; label: string; detail: string }> = [
  { id: "overview", label: "Overview", detail: "Today’s operating picture" },
  { id: "customers", label: "Customers", detail: "Leads, clients and follow-ups" },
  { id: "work", label: "Jobs & Work", detail: "Jobs, projects, orders or bookings" },
  { id: "tasks", label: "Tasks", detail: "Daily and recurring actions" },
  { id: "money", label: "Money", detail: "Cash, invoices and obligations" },
  { id: "team", label: "Team", detail: "People and responsibilities" },
  { id: "compliance", label: "Compliance", detail: "Tax, licences and deadlines" },
];
const emptyItem = (): OperatingItem => ({ id: "", title: "", detail: "", due: "", owner: "", value: "", status: "active" });
const starter = (saved: SavedReport): RunStore => ({
  customers: [{ id: "customer-1", title: "Top customer follow-up", detail: "Record the next action for the customer most important to cash flow.", due: "", owner: "Owner", value: "", status: saved.data.overdueInvoices > 0 ? "attention" : "active" }],
  work: [{ id: "work-1", title: "Current priority work", detail: "Track delivery stage, next action and payment risk.", due: "", owner: "Owner", value: "", status: "active" }],
  tasks: saved.report.today.map((action, index) => ({ id: `recovery-${index}`, title: action.title, detail: action.reason, due: "Today", owner: "Owner", value: "", status: "attention" as Status })),
  money: [
    { id: "cash-1", title: "Available cash", detail: "Latest MRI figure", due: "", owner: "", value: saved.data.cashAvailable.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }), status: "active" },
    { id: "invoice-1", title: "Overdue invoices", detail: "Money requiring collection", due: "", owner: "", value: saved.data.overdueInvoices.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }), status: saved.data.overdueInvoices > 0 ? "attention" : "done" },
  ],
  team: [{ id: "team-1", title: "Business owner", detail: "Overall operating accountability", due: "", owner: saved.data.businessName, value: "", status: "active" }],
  compliance: [
    { id: "tax-1", title: "Tax obligations", detail: "Confirm lodgements, arrears and payment arrangements.", due: "", owner: "Owner / tax agent", value: saved.data.overdueTax ? saved.data.overdueTax.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }) : "No overdue amount recorded", status: saved.data.overdueTax > 0 ? "attention" : "active" },
    { id: "licence-1", title: "Licences and insurance", detail: "Add renewal dates and responsible person.", due: "", owner: "Owner", value: "", status: "attention" },
  ],
  checkIn: null,
});

function readStore(saved: SavedReport): RunStore {
  if (typeof window === "undefined") return starter(saved);
  try { const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as RunStore | null; return parsed && Array.isArray(parsed.tasks) ? parsed : starter(saved); } catch { return starter(saved); }
}

export function RunModeFoundation({ saved }: { saved: SavedReport }) {
  const [activeView, setActiveView] = useState<RunView>("overview");
  const [store, setStore] = useState<RunStore>(() => starter(saved));
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState<OperatingItem>(emptyItem());
  const [checkIn, setCheckIn] = useState<Omit<WeeklyCheckIn, "updatedAt">>({ cashAvailable: "", salesReceived: "", overdueInvoices: "", billsDue: "", ownerCapacity: "good", biggestIssue: "" });

  useEffect(() => { const next = readStore(saved); setStore(next); if (next.checkIn) { const { updatedAt: _updatedAt, ...values } = next.checkIn; void _updatedAt; setCheckIn(values); } setReady(true); }, [saved]);
  useEffect(() => { if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }, [store, ready]);

  const collections = useMemo(() => [...store.customers, ...store.work, ...store.tasks, ...store.money, ...store.team, ...store.compliance], [store]);
  const attention = collections.filter((item) => item.status === "attention").length;
  const done = collections.filter((item) => item.status === "done").length;
  const activeItems = activeView === "overview" ? [] : store[activeView];

  const addItem = (event: FormEvent) => {
    event.preventDefault();
    if (activeView === "overview" || !form.title.trim()) return;
    const next = { ...form, id: `${activeView}-${Date.now()}`, title: form.title.trim() };
    setStore((current) => ({ ...current, [activeView]: [...current[activeView], next] }));
    setForm(emptyItem());
  };
  const cycle = (view: Exclude<RunView, "overview">, id: string) => setStore((current) => ({ ...current, [view]: current[view].map((item) => item.id === id ? { ...item, status: item.status === "attention" ? "active" : item.status === "active" ? "done" : "attention" } : item) }));
  const remove = (view: Exclude<RunView, "overview">, id: string) => setStore((current) => ({ ...current, [view]: current[view].filter((item) => item.id !== id) }));
  const saveCheckIn = () => setStore((current) => ({ ...current, checkIn: { ...checkIn, updatedAt: new Date().toISOString() } }));

  return (
    <div className="run-core-shell">
      <section className="run-core-hero">
        <div><p className="eyebrow">RUN MY BUSINESS · OPERATING CORE</p><h1>Operate {saved.data.businessName} from one place.</h1><p>The MRI diagnoses the business. Recovery stabilises it. Run My Business turns customers, work, money, people and obligations into a repeatable daily operating system.</p></div>
        <div className="run-core-score"><span><strong>{saved.report.metrics.overallScore}</strong><small>MRI health</small></span><span><strong>{attention}</strong><small>Needs attention</small></span><span><strong>{done}</strong><small>Completed</small></span></div>
      </section>

      <nav className="run-core-nav" aria-label="Run My Business sections">{views.map((view) => <button key={view.id} type="button" className={activeView === view.id ? "active" : ""} onClick={() => setActiveView(view.id)}><strong>{view.label}</strong><small>{view.detail}</small></button>)}</nav>

      {activeView === "overview" ? (
        <div className="run-overview-grid">
          <section className="run-summary-card"><p className="eyebrow">TODAY</p><h2>What requires attention</h2>{collections.filter((item) => item.status === "attention").slice(0, 6).map((item) => <article key={item.id}><strong>{item.title}</strong><span>{item.detail}</span></article>)}{attention === 0 && <p>No operating item is marked as needing attention.</p>}</section>
          <section className="run-summary-card"><p className="eyebrow">WEEKLY CONTROL</p><h2>Business health check</h2><div className="run-check-grid"><label>Available cash<input value={checkIn.cashAvailable} onChange={(e) => setCheckIn({ ...checkIn, cashAvailable: e.target.value })} placeholder="$0" /></label><label>Sales received<input value={checkIn.salesReceived} onChange={(e) => setCheckIn({ ...checkIn, salesReceived: e.target.value })} placeholder="$0" /></label><label>Overdue invoices<input value={checkIn.overdueInvoices} onChange={(e) => setCheckIn({ ...checkIn, overdueInvoices: e.target.value })} placeholder="$0" /></label><label>Bills due soon<input value={checkIn.billsDue} onChange={(e) => setCheckIn({ ...checkIn, billsDue: e.target.value })} placeholder="$0" /></label><label>Owner capacity<select value={checkIn.ownerCapacity} onChange={(e) => setCheckIn({ ...checkIn, ownerCapacity: e.target.value as WeeklyCheckIn["ownerCapacity"] })}><option value="good">Good</option><option value="stretched">Stretched</option><option value="critical">Critical</option></select></label><label className="wide">Biggest issue<textarea value={checkIn.biggestIssue} onChange={(e) => setCheckIn({ ...checkIn, biggestIssue: e.target.value })} /></label></div><button type="button" className="button primary" onClick={saveCheckIn}>Save weekly check-in <span>→</span></button>{store.checkIn && <small>Last saved {new Date(store.checkIn.updatedAt).toLocaleString()}</small>}</section>
        </div>
      ) : (
        <div className="run-register-layout">
          <section className="run-register"><div className="section-heading"><div><p className="eyebrow">{views.find((view) => view.id === activeView)?.label.toUpperCase()}</p><h2>{views.find((view) => view.id === activeView)?.detail}</h2></div><span>{activeItems.length} items</span></div>{activeItems.map((item) => <article className={`run-register-item ${item.status}`} key={item.id}><button type="button" className="run-status" onClick={() => cycle(activeView, item.id)}>{item.status === "attention" ? "Needs attention" : item.status === "active" ? "Active" : "Complete"}</button><div><strong>{item.title}</strong><p>{item.detail}</p><small>{[item.owner && `Owner: ${item.owner}`, item.due && `Due: ${item.due}`, item.value].filter(Boolean).join(" · ")}</small></div><button type="button" className="run-remove" aria-label={`Remove ${item.title}`} onClick={() => remove(activeView, item.id)}>×</button></article>)}{activeItems.length === 0 && <p className="run-empty">Nothing added yet. Use the form to create the first item.</p>}</section>
          <form className="run-add-form" onSubmit={addItem}><p className="eyebrow">ADD ITEM</p><h3>Add to {views.find((view) => view.id === activeView)?.label}</h3><label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label><label>Details<textarea value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} /></label><label>Owner<input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></label><label>Due date or timing<input value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} placeholder="Friday, 30 days, monthly…" /></label><label>Value or amount<input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></label><label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}><option value="active">Active</option><option value="attention">Needs attention</option><option value="done">Complete</option></select></label><button className="button primary" type="submit">Add item <span>→</span></button></form>
        </div>
      )}
      <p className="run-core-note">This operating-core release stores data privately in this browser. Secure accounts, team permissions, cloud sync and accounting integrations belong to the commercial backend stage.</p>
    </div>
  );
}
