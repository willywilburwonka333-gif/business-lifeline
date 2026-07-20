"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { SavedReport } from "@/lib/saved-report";

const CONTROL_KEY = "business-lifeline-live-control-v1";
const OPERATING_KEY = "business-lifeline-operating-platform-v1";

type Obligation = { id: string; title: string; due: string; owner: string; status: "open" | "done"; category: string };
type Appointment = { id: string; title: string; customer: string; date: string; status: "booked" | "complete" | "cancelled" };
type PurchaseOrder = { id: string; supplier: string; description: string; amount: number; status: "draft" | "ordered" | "received"; due: string };
type ControlState = { cashBalance: number; taxReserve: number; monthlyPayroll: number; monthlyFixedCosts: number; obligations: Obligation[]; appointments: Appointment[]; purchaseOrders: PurchaseOrder[]; history: { score: number; at: string }[] };
type OperatingStore = { customers?: unknown[]; products?: Array<{ qty?: number; reorder?: number; cost?: number }>; quotes?: Array<{ status?: string; amount?: number }>; jobs?: Array<{ status?: string }>; invoices?: Array<{ status?: string; amount?: number }>; sales?: Array<{ total?: number; createdAt?: string; items?: Array<{ qty?: number; productId?: string }> }>; expenses?: Array<{ amount?: number; date?: string }>; tasks?: Array<{ done?: boolean; due?: string; owner?: string }>; suppliers?: unknown[] };

const empty: ControlState = { cashBalance: 0, taxReserve: 0, monthlyPayroll: 0, monthlyFixedCosts: 0, obligations: [], appointments: [], purchaseOrders: [], history: [] };
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const money = (value: number) => value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function baselineScore(saved: SavedReport) {
  const report = saved.report as unknown as Record<string, unknown>;
  const candidates = [report.healthScore, report.score, report.overallScore, report.businessHealthScore];
  return candidates.find((value) => typeof value === "number") as number | undefined;
}

export function LiveBusinessControl({ saved }: { saved: SavedReport }) {
  const [control, setControl] = useState<ControlState>(empty);
  const [operating, setOperating] = useState<OperatingStore>({});
  const [ready, setReady] = useState(false);
  const [obligation, setObligation] = useState({ title: "", due: "", owner: "", category: "Compliance" });
  const [appointment, setAppointment] = useState({ title: "", customer: "", date: "" });
  const [purchase, setPurchase] = useState({ supplier: "", description: "", amount: 0, due: "" });

  useEffect(() => {
    try { const raw = localStorage.getItem(CONTROL_KEY); if (raw) setControl({ ...empty, ...JSON.parse(raw) }); } catch {}
    try { const raw = localStorage.getItem(OPERATING_KEY); if (raw) setOperating(JSON.parse(raw)); } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(CONTROL_KEY, JSON.stringify(control)); }, [control, ready]);
  useEffect(() => { if (!ready) return; const timer = window.setInterval(() => { try { const raw = localStorage.getItem(OPERATING_KEY); if (raw) setOperating(JSON.parse(raw)); } catch {} }, 1500); return () => clearInterval(timer); }, [ready]);

  const metrics = useMemo(() => {
    const sales = operating.sales ?? [];
    const invoices = operating.invoices ?? [];
    const products = operating.products ?? [];
    const tasks = operating.tasks ?? [];
    const now = Date.now();
    const thirtyDays = 30 * 86400000;
    const revenue30 = sales.filter((sale) => !sale.createdAt || now - new Date(sale.createdAt).getTime() <= thirtyDays).reduce((sum, sale) => sum + Number(sale.total ?? 0), 0);
    const expenses30 = (operating.expenses ?? []).filter((expense) => !expense.date || now - new Date(expense.date).getTime() <= thirtyDays).reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);
    const outstanding = invoices.filter((invoice) => invoice.status !== "paid").reduce((sum, invoice) => sum + Number(invoice.amount ?? 0), 0);
    const overdue = invoices.filter((invoice) => invoice.status === "overdue").length;
    const lowStock = products.filter((product) => Number(product.qty ?? 0) <= Number(product.reorder ?? 0)).length;
    const openTasks = tasks.filter((task) => !task.done).length;
    const unownedTasks = tasks.filter((task) => !task.done && !task.owner).length;
    const openObligations = control.obligations.filter((item) => item.status === "open");
    const overdueObligations = openObligations.filter((item) => item.due && new Date(item.due).getTime() < now).length;
    const monthlyBurn = control.monthlyFixedCosts + control.monthlyPayroll + expenses30;
    const runway = monthlyBurn > 0 ? control.cashBalance / monthlyBurn : 0;
    const pipeline = (operating.quotes ?? []).filter((quote) => quote.status === "draft" || quote.status === "sent").reduce((sum, quote) => sum + Number(quote.amount ?? 0), 0);
    const baseline = baselineScore(saved) ?? 60;
    const cashScore = clamp(runway >= 3 ? 90 : runway >= 2 ? 75 : runway >= 1 ? 55 : control.cashBalance > 0 ? 35 : 15);
    const salesScore = clamp(revenue30 > monthlyBurn ? 85 : revenue30 > monthlyBurn * .75 ? 65 : revenue30 > 0 ? 45 : 20);
    const collectionsScore = clamp(90 - overdue * 15 - Math.min(40, outstanding / Math.max(revenue30, 1) * 25));
    const operationsScore = clamp(90 - lowStock * 7 - openTasks * 2 - unownedTasks * 5);
    const complianceScore = clamp(95 - overdueObligations * 18 - Math.max(0, openObligations.length - 5) * 2);
    const live = clamp(baseline * .2 + cashScore * .25 + salesScore * .2 + collectionsScore * .15 + operationsScore * .1 + complianceScore * .1);
    const confidenceSignals = [sales.length > 0, invoices.length > 0, products.length > 0, control.cashBalance > 0, control.monthlyFixedCosts > 0, control.obligations.length > 0];
    const confidence = Math.round(confidenceSignals.filter(Boolean).length / confidenceSignals.length * 100);
    return { revenue30, expenses30, outstanding, overdue, lowStock, openTasks, unownedTasks, runway, pipeline, monthlyBurn, baseline, cashScore, salesScore, collectionsScore, operationsScore, complianceScore, live, confidence, overdueObligations };
  }, [control, operating, saved]);

  useEffect(() => {
    if (!ready) return;
    setControl((current) => {
      const last = current.history[0];
      if (last && last.score === metrics.live && Date.now() - new Date(last.at).getTime() < 3600000) return current;
      return { ...current, history: [{ score: metrics.live, at: new Date().toISOString() }, ...current.history].slice(0, 90) };
    });
  }, [metrics.live, ready]);

  const addObligation = (event: FormEvent) => { event.preventDefault(); if (!obligation.title.trim()) return; setControl((current) => ({ ...current, obligations: [{ id: id("obligation"), ...obligation, status: "open" }, ...current.obligations] })); setObligation({ title: "", due: "", owner: "", category: "Compliance" }); };
  const addAppointment = (event: FormEvent) => { event.preventDefault(); if (!appointment.title.trim()) return; setControl((current) => ({ ...current, appointments: [{ id: id("appointment"), ...appointment, status: "booked" }, ...current.appointments] })); setAppointment({ title: "", customer: "", date: "" }); };
  const addPurchase = (event: FormEvent) => { event.preventDefault(); if (!purchase.supplier.trim()) return; setControl((current) => ({ ...current, purchaseOrders: [{ id: id("po"), ...purchase, status: "draft" }, ...current.purchaseOrders] })); setPurchase({ supplier: "", description: "", amount: 0, due: "" }); };

  const band = metrics.live >= 80 ? "Strong" : metrics.live >= 65 ? "Stable" : metrics.live >= 45 ? "Under pressure" : "Critical";
  const missing = [!control.cashBalance && "cash balance", !control.monthlyFixedCosts && "fixed costs", !(operating.sales?.length) && "sales", !(operating.invoices?.length) && "invoices", !control.obligations.length && "compliance dates"].filter(Boolean) as string[];

  return <section className="live-control">
    <header className="live-control-hero"><div><small>LIVE BUSINESS CONTROL TOWER</small><h2>{metrics.live}/100 · {band}</h2><p>Continuously recalculated from the latest MRI plus sales, invoices, stock, tasks, cash settings and obligations.</p></div><div><strong>{metrics.confidence}%</strong><span>data confidence</span></div></header>
    <div className="live-score-grid">{[["Cash", metrics.cashScore], ["Sales", metrics.salesScore], ["Collections", metrics.collectionsScore], ["Operations", metrics.operationsScore], ["Compliance", metrics.complianceScore]].map(([label, score]) => <article key={String(label)}><small>{label}</small><strong>{score}/100</strong><progress max="100" value={Number(score)} /></article>)}</div>
    <div className="live-kpis"><article><small>Cash runway</small><strong>{metrics.runway ? `${metrics.runway.toFixed(1)} months` : "Needs data"}</strong></article><article><small>30-day revenue</small><strong>{money(metrics.revenue30)}</strong></article><article><small>Outstanding invoices</small><strong>{money(metrics.outstanding)}</strong></article><article><small>Open pipeline</small><strong>{money(metrics.pipeline)}</strong></article><article><small>Low stock</small><strong>{metrics.lowStock}</strong></article><article><small>Overdue obligations</small><strong>{metrics.overdueObligations}</strong></article></div>
    <div className="live-grid"><section><h3>Financial control inputs</h3><label>Current bank and cash balance<input type="number" value={control.cashBalance || ""} onChange={(event) => setControl({ ...control, cashBalance: +event.target.value })} /></label><label>Tax reserve<input type="number" value={control.taxReserve || ""} onChange={(event) => setControl({ ...control, taxReserve: +event.target.value })} /></label><label>Normal monthly payroll<input type="number" value={control.monthlyPayroll || ""} onChange={(event) => setControl({ ...control, monthlyPayroll: +event.target.value })} /></label><label>Normal monthly fixed costs<input type="number" value={control.monthlyFixedCosts || ""} onChange={(event) => setControl({ ...control, monthlyFixedCosts: +event.target.value })} /></label><p>Estimated monthly burn: <strong>{money(metrics.monthlyBurn)}</strong></p></section><section><h3>What changes the score now</h3>{metrics.overdue > 0 && <p>Collect {metrics.overdue} overdue invoice{metrics.overdue === 1 ? "" : "s"}.</p>}{metrics.lowStock > 0 && <p>Resolve {metrics.lowStock} low-stock item{metrics.lowStock === 1 ? "" : "s"}.</p>}{metrics.unownedTasks > 0 && <p>Assign owners to {metrics.unownedTasks} open task{metrics.unownedTasks === 1 ? "" : "s"}.</p>}{metrics.runway < 1 && <p>Cash runway is below one month. Reduce burn, collect cash or secure funding.</p>}{missing.length > 0 && <p>Improve score confidence by adding: {missing.join(", ")}.</p>}{metrics.overdue === 0 && metrics.lowStock === 0 && metrics.unownedTasks === 0 && metrics.runway >= 1 && <p>No immediate operating exceptions detected.</p>}</section></div>
    <div className="live-grid"><form onSubmit={addObligation}><h3>Compliance and obligations</h3><input placeholder="BAS, licence, insurance, contract review…" value={obligation.title} onChange={(event) => setObligation({ ...obligation, title: event.target.value })} /><input type="date" value={obligation.due} onChange={(event) => setObligation({ ...obligation, due: event.target.value })} /><input placeholder="Owner" value={obligation.owner} onChange={(event) => setObligation({ ...obligation, owner: event.target.value })} /><select value={obligation.category} onChange={(event) => setObligation({ ...obligation, category: event.target.value })}><option>Compliance</option><option>Tax</option><option>Insurance</option><option>Licence</option><option>Contract</option></select><button>Add obligation</button>{control.obligations.map((item) => <article key={item.id}><strong>{item.title}</strong><small>{item.category} · {item.due || "No due date"} · {item.owner || "Unassigned"}</small><button type="button" onClick={() => setControl((current) => ({ ...current, obligations: current.obligations.map((entry) => entry.id === item.id ? { ...entry, status: entry.status === "open" ? "done" : "open" } : entry) }))}>{item.status === "open" ? "Mark done" : "Reopen"}</button></article>)}</form><form onSubmit={addAppointment}><h3>Appointments and scheduled work</h3><input placeholder="Appointment or job" value={appointment.title} onChange={(event) => setAppointment({ ...appointment, title: event.target.value })} /><input placeholder="Customer" value={appointment.customer} onChange={(event) => setAppointment({ ...appointment, customer: event.target.value })} /><input type="datetime-local" value={appointment.date} onChange={(event) => setAppointment({ ...appointment, date: event.target.value })} /><button>Book appointment</button>{control.appointments.map((item) => <article key={item.id}><strong>{item.title}</strong><small>{item.customer || "No customer"} · {item.date || "Unscheduled"}</small><button type="button" onClick={() => setControl((current) => ({ ...current, appointments: current.appointments.map((entry) => entry.id === item.id ? { ...entry, status: "complete" } : entry) }))}>Complete</button></article>)}</form></div>
    <form onSubmit={addPurchase} className="live-purchase"><h3>Purchase orders and receiving</h3><input placeholder="Supplier" value={purchase.supplier} onChange={(event) => setPurchase({ ...purchase, supplier: event.target.value })} /><input placeholder="What is being ordered" value={purchase.description} onChange={(event) => setPurchase({ ...purchase, description: event.target.value })} /><input type="number" placeholder="Amount" value={purchase.amount || ""} onChange={(event) => setPurchase({ ...purchase, amount: +event.target.value })} /><input type="date" value={purchase.due} onChange={(event) => setPurchase({ ...purchase, due: event.target.value })} /><button>Create purchase order</button><div className="live-po-list">{control.purchaseOrders.map((item) => <article key={item.id}><small>{item.status.toUpperCase()}</small><strong>{item.supplier} · {money(item.amount)}</strong><span>{item.description} · due {item.due || "not set"}</span><button type="button" onClick={() => setControl((current) => ({ ...current, purchaseOrders: current.purchaseOrders.map((entry) => entry.id === item.id ? { ...entry, status: entry.status === "draft" ? "ordered" : "received" } : entry) }))}>{item.status === "draft" ? "Mark ordered" : item.status === "ordered" ? "Receive order" : "Received"}</button></article>)}</div></form>
    <section><h3>Health history</h3><div className="health-history">{control.history.slice(0, 12).map((point) => <div key={point.at}><i style={{ height: `${point.score}%` }} /><span>{point.score}</span><small>{new Date(point.at).toLocaleDateString()}</small></div>)}</div></section>
  </section>;
}
