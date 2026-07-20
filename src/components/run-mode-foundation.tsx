"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import type { SavedReport } from "@/lib/saved-report";

type RunView = "overview" | "customers" | "work" | "tasks" | "money" | "stock" | "sales" | "team" | "compliance";
type Status = "attention" | "active" | "done";
type OperatingItem = { id: string; title: string; detail: string; due: string; owner: string; value: string; status: Status };
type StockItem = { id: string; name: string; sku: string; barcode: string; quantity: number; reorderAt: number; sellPrice: number; costPrice: number; supplier: string; updatedAt: string };
type Sale = { id: string; stockId: string; itemName: string; quantity: number; total: number; payment: string; soldAt: string };
type WeeklyCheckIn = { cashAvailable: string; salesReceived: string; overdueInvoices: string; billsDue: string; ownerCapacity: "good" | "stretched" | "critical"; biggestIssue: string; updatedAt: string };
type RunStore = { customers: OperatingItem[]; work: OperatingItem[]; tasks: OperatingItem[]; money: OperatingItem[]; team: OperatingItem[]; compliance: OperatingItem[]; stock: StockItem[]; sales: Sale[]; checkIn: WeeklyCheckIn | null };

const STORAGE_KEY = "business-lifeline-run-operating-core-v2";
const views: Array<{ id: RunView; label: string; detail: string }> = [
  { id: "overview", label: "Overview", detail: "Today’s operating picture" },
  { id: "customers", label: "Customers", detail: "Leads, clients and follow-ups" },
  { id: "work", label: "Jobs & Work", detail: "Jobs, projects, orders or bookings" },
  { id: "tasks", label: "Tasks", detail: "Daily and recurring actions" },
  { id: "money", label: "Money", detail: "Cash, invoices and obligations" },
  { id: "stock", label: "Stock", detail: "Products, quantities and reorder alerts" },
  { id: "sales", label: "Sales", detail: "Simple market, counter and mobile sales" },
  { id: "team", label: "Team", detail: "People and responsibilities" },
  { id: "compliance", label: "Compliance", detail: "Tax, licences and deadlines" },
];
const emptyItem = (): OperatingItem => ({ id: "", title: "", detail: "", due: "", owner: "", value: "", status: "active" });
const emptyStock = (): Omit<StockItem, "id" | "updatedAt"> => ({ name: "", sku: "", barcode: "", quantity: 0, reorderAt: 0, sellPrice: 0, costPrice: 0, supplier: "" });

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
  stock: [],
  sales: [],
  checkIn: null,
});

function readStore(saved: SavedReport): RunStore {
  if (typeof window === "undefined") return starter(saved);
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<RunStore> | null;
    if (!parsed || !Array.isArray(parsed.tasks)) return starter(saved);
    return { ...starter(saved), ...parsed, stock: Array.isArray(parsed.stock) ? parsed.stock : [], sales: Array.isArray(parsed.sales) ? parsed.sales : [] } as RunStore;
  } catch { return starter(saved); }
}

export function RunModeFoundation({ saved }: { saved: SavedReport }) {
  const [activeView, setActiveView] = useState<RunView>("overview");
  const [store, setStore] = useState<RunStore>(() => starter(saved));
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState<OperatingItem>(emptyItem());
  const [stockForm, setStockForm] = useState(emptyStock());
  const [saleStockId, setSaleStockId] = useState("");
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [salePayment, setSalePayment] = useState("Card");
  const [scanMessage, setScanMessage] = useState("");
  const [checkIn, setCheckIn] = useState<Omit<WeeklyCheckIn, "updatedAt">>({ cashAvailable: "", salesReceived: "", overdueInvoices: "", billsDue: "", ownerCapacity: "good", biggestIssue: "" });

  useEffect(() => { const next = readStore(saved); setStore(next); if (next.checkIn) { const { updatedAt: _updatedAt, ...values } = next.checkIn; void _updatedAt; setCheckIn(values); } setReady(true); }, [saved]);
  useEffect(() => { if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }, [store, ready]);

  const collections = useMemo(() => [...store.customers, ...store.work, ...store.tasks, ...store.money, ...store.team, ...store.compliance], [store]);
  const attention = collections.filter((item) => item.status === "attention").length + store.stock.filter((item) => item.quantity <= item.reorderAt).length;
  const done = collections.filter((item) => item.status === "done").length;
  const todaySales = store.sales.filter((sale) => sale.soldAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).reduce((sum, sale) => sum + sale.total, 0);
  const activeItems = activeView === "overview" || activeView === "stock" || activeView === "sales" ? [] : store[activeView];

  const addItem = (event: FormEvent) => {
    event.preventDefault();
    if (["overview", "stock", "sales"].includes(activeView) || !form.title.trim()) return;
    const view = activeView as Exclude<RunView, "overview" | "stock" | "sales">;
    const next = { ...form, id: `${view}-${Date.now()}`, title: form.title.trim() };
    setStore((current) => ({ ...current, [view]: [...current[view], next] }));
    setForm(emptyItem());
  };
  const cycle = (view: Exclude<RunView, "overview" | "stock" | "sales">, id: string) => setStore((current) => ({ ...current, [view]: current[view].map((item) => item.id === id ? { ...item, status: item.status === "attention" ? "active" : item.status === "active" ? "done" : "attention" } : item) }));
  const remove = (view: Exclude<RunView, "overview" | "stock" | "sales">, id: string) => setStore((current) => ({ ...current, [view]: current[view].filter((item) => item.id !== id) }));
  const saveCheckIn = () => setStore((current) => ({ ...current, checkIn: { ...checkIn, updatedAt: new Date().toISOString() } }));

  const addStock = (event: FormEvent) => {
    event.preventDefault();
    if (!stockForm.name.trim()) return;
    const item: StockItem = { ...stockForm, id: `stock-${Date.now()}`, name: stockForm.name.trim(), updatedAt: new Date().toISOString() };
    setStore((current) => ({ ...current, stock: [...current.stock, item] }));
    setStockForm(emptyStock());
  };
  const adjustStock = (id: string, amount: number) => setStore((current) => ({ ...current, stock: current.stock.map((item) => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + amount), updatedAt: new Date().toISOString() } : item) }));
  const removeStock = (id: string) => setStore((current) => ({ ...current, stock: current.stock.filter((item) => item.id !== id), sales: current.sales.filter((sale) => sale.stockId !== id) }));

  const recordSale = (event: FormEvent) => {
    event.preventDefault();
    const product = store.stock.find((item) => item.id === saleStockId);
    if (!product || saleQuantity < 1 || product.quantity < saleQuantity) return;
    const sale: Sale = { id: `sale-${Date.now()}`, stockId: product.id, itemName: product.name, quantity: saleQuantity, total: product.sellPrice * saleQuantity, payment: salePayment, soldAt: new Date().toISOString() };
    setStore((current) => ({
      ...current,
      stock: current.stock.map((item) => item.id === product.id ? { ...item, quantity: item.quantity - saleQuantity, updatedAt: new Date().toISOString() } : item),
      sales: [sale, ...current.sales],
      money: [{ id: `money-${sale.id}`, title: `Sale · ${product.name}`, detail: `${saleQuantity} sold via ${salePayment}`, due: "Received", owner: "", value: sale.total.toLocaleString("en-AU", { style: "currency", currency: "AUD" }), status: "done" }, ...current.money],
    }));
    setSaleQuantity(1);
  };

  async function scanBarcode(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setScanMessage("Reading barcode…");
    try {
      const Detector = (globalThis as unknown as { BarcodeDetector?: new (options?: { formats?: string[] }) => { detect(source: ImageBitmap): Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector;
      if (!Detector) throw new Error("Automatic barcode reading is not supported in this browser. Enter the barcode manually.");
      const bitmap = await createImageBitmap(file);
      const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"] });
      const result = await detector.detect(bitmap);
      bitmap.close();
      const barcode = result[0]?.rawValue;
      if (!barcode) throw new Error("No barcode was detected. Try again with a clearer photo.");
      setStockForm((current) => ({ ...current, barcode }));
      const match = store.stock.find((item) => item.barcode === barcode);
      setScanMessage(match ? `Matched ${match.name}.` : `Barcode ${barcode} captured. Add the product details.`);
    } catch (error) {
      setScanMessage(error instanceof Error ? error.message : "Barcode could not be read.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="run-core-shell">
      <section className="run-core-hero"><div><p className="eyebrow">RUN MY BUSINESS · OPERATING CORE</p><h1>Operate {saved.data.businessName} from one place.</h1><p>The MRI diagnoses the business. Recovery stabilises it. Run My Business connects customers, work, money, stock, sales, people and obligations in one daily operating system.</p></div><div className="run-core-score"><span><strong>{saved.report.metrics.overallScore}</strong><small>MRI health</small></span><span><strong>{attention}</strong><small>Needs attention</small></span><span><strong>{todaySales.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })}</strong><small>Sales today</small></span></div></section>
      <nav className="run-core-nav" aria-label="Run My Business sections">{views.map((view) => <button key={view.id} type="button" className={activeView === view.id ? "active" : ""} onClick={() => setActiveView(view.id)}><strong>{view.label}</strong><small>{view.detail}</small></button>)}</nav>

      {activeView === "overview" && <div className="run-overview-grid"><section className="run-summary-card"><p className="eyebrow">TODAY</p><h2>What requires attention</h2>{collections.filter((item) => item.status === "attention").slice(0, 5).map((item) => <article key={item.id}><strong>{item.title}</strong><span>{item.detail}</span></article>)}{store.stock.filter((item) => item.quantity <= item.reorderAt).slice(0, 4).map((item) => <article key={item.id}><strong>Reorder {item.name}</strong><span>{item.quantity} remaining · reorder point {item.reorderAt}</span></article>)}{attention === 0 && <p>No operating item is marked as needing attention.</p>}</section><section className="run-summary-card"><p className="eyebrow">WEEKLY CONTROL</p><h2>Business health check</h2><div className="run-check-grid"><label>Available cash<input value={checkIn.cashAvailable} onChange={(e) => setCheckIn({ ...checkIn, cashAvailable: e.target.value })} placeholder="$0" /></label><label>Sales received<input value={checkIn.salesReceived} onChange={(e) => setCheckIn({ ...checkIn, salesReceived: e.target.value })} placeholder="$0" /></label><label>Overdue invoices<input value={checkIn.overdueInvoices} onChange={(e) => setCheckIn({ ...checkIn, overdueInvoices: e.target.value })} placeholder="$0" /></label><label>Bills due soon<input value={checkIn.billsDue} onChange={(e) => setCheckIn({ ...checkIn, billsDue: e.target.value })} placeholder="$0" /></label><label>Owner capacity<select value={checkIn.ownerCapacity} onChange={(e) => setCheckIn({ ...checkIn, ownerCapacity: e.target.value as WeeklyCheckIn["ownerCapacity"] })}><option value="good">Good</option><option value="stretched">Stretched</option><option value="critical">Critical</option></select></label><label className="wide">Biggest issue<textarea value={checkIn.biggestIssue} onChange={(e) => setCheckIn({ ...checkIn, biggestIssue: e.target.value })} /></label></div><button type="button" className="button primary" onClick={saveCheckIn}>Save weekly check-in <span>→</span></button>{store.checkIn && <small>Last saved {new Date(store.checkIn.updatedAt).toLocaleString()}</small>}</section></div>}

      {activeView === "stock" && <div className="run-register-layout"><section className="run-register"><div className="section-heading"><div><p className="eyebrow">PRODUCTS & STOCK</p><h2>Know what you have and what must be reordered.</h2></div><span>{store.stock.length} products</span></div>{store.stock.map((item) => <article className={`stock-row ${item.quantity <= item.reorderAt ? "attention" : ""}`} key={item.id}><div><strong>{item.name}</strong><p>{[item.sku && `SKU ${item.sku}`, item.barcode && `Barcode ${item.barcode}`, item.supplier].filter(Boolean).join(" · ")}</p><small>Sell {item.sellPrice.toLocaleString("en-AU", { style: "currency", currency: "AUD" })} · Cost {item.costPrice.toLocaleString("en-AU", { style: "currency", currency: "AUD" })}</small></div><div className="stock-quantity"><button type="button" onClick={() => adjustStock(item.id, -1)}>−</button><strong>{item.quantity}</strong><button type="button" onClick={() => adjustStock(item.id, 1)}>+</button><small>Reorder at {item.reorderAt}</small></div><button type="button" className="run-remove" onClick={() => removeStock(item.id)}>×</button></article>)}{store.stock.length === 0 && <p className="run-empty">No stock added yet.</p>}</section><form className="run-add-form" onSubmit={addStock}><p className="eyebrow">ADD OR SCAN PRODUCT</p><h3>Create a stock item</h3><label className="scanner-button">Take barcode photo<input type="file" accept="image/*" capture="environment" onChange={scanBarcode} /></label>{scanMessage && <small>{scanMessage}</small>}<label>Product name<input value={stockForm.name} onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })} required /></label><label>SKU<input value={stockForm.sku} onChange={(e) => setStockForm({ ...stockForm, sku: e.target.value })} /></label><label>Barcode<input value={stockForm.barcode} onChange={(e) => setStockForm({ ...stockForm, barcode: e.target.value })} inputMode="numeric" /></label><label>Quantity<input type="number" min="0" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: Number(e.target.value) })} /></label><label>Reorder point<input type="number" min="0" value={stockForm.reorderAt} onChange={(e) => setStockForm({ ...stockForm, reorderAt: Number(e.target.value) })} /></label><label>Sell price<input type="number" min="0" step="0.01" value={stockForm.sellPrice} onChange={(e) => setStockForm({ ...stockForm, sellPrice: Number(e.target.value) })} /></label><label>Cost price<input type="number" min="0" step="0.01" value={stockForm.costPrice} onChange={(e) => setStockForm({ ...stockForm, costPrice: Number(e.target.value) })} /></label><label>Supplier<input value={stockForm.supplier} onChange={(e) => setStockForm({ ...stockForm, supplier: e.target.value })} /></label><button className="button primary" type="submit">Add product <span>→</span></button></form></div>}

      {activeView === "sales" && <div className="run-register-layout"><section className="run-register"><div className="section-heading"><div><p className="eyebrow">SALES REGISTER</p><h2>Fast sales for markets, counters and mobile businesses.</h2></div><span>{todaySales.toLocaleString("en-AU", { style: "currency", currency: "AUD" })} today</span></div>{store.sales.slice(0, 30).map((sale) => <article className="sale-row" key={sale.id}><div><strong>{sale.itemName}</strong><p>{sale.quantity} sold · {sale.payment}</p><small>{new Date(sale.soldAt).toLocaleString()}</small></div><strong>{sale.total.toLocaleString("en-AU", { style: "currency", currency: "AUD" })}</strong></article>)}{store.sales.length === 0 && <p className="run-empty">No sales recorded yet.</p>}</section><form className="run-add-form" onSubmit={recordSale}><p className="eyebrow">QUICK SALE</p><h3>Record a sale and reduce stock automatically</h3><label>Product<select value={saleStockId} onChange={(e) => setSaleStockId(e.target.value)} required><option value="">Choose product</option>{store.stock.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.quantity} available</option>)}</select></label><label>Quantity<input type="number" min="1" value={saleQuantity} onChange={(e) => setSaleQuantity(Number(e.target.value))} /></label><label>Payment<select value={salePayment} onChange={(e) => setSalePayment(e.target.value)}><option>Card</option><option>Cash</option><option>Bank transfer</option><option>Online</option><option>Other</option></select></label><button className="button primary" type="submit" disabled={!saleStockId}>Record sale <span>→</span></button><small>Recording a sale reduces stock and creates a completed Money entry automatically.</small></form></div>}

      {!(["overview", "stock", "sales"] as RunView[]).includes(activeView) && <div className="run-register-layout"><section className="run-register"><div className="section-heading"><div><p className="eyebrow">{views.find((view) => view.id === activeView)?.label.toUpperCase()}</p><h2>{views.find((view) => view.id === activeView)?.detail}</h2></div><span>{activeItems.length} items</span></div>{activeItems.map((item) => <article className={`run-register-item ${item.status}`} key={item.id}><button type="button" className="run-status" onClick={() => cycle(activeView as Exclude<RunView, "overview" | "stock" | "sales">, item.id)}>{item.status === "attention" ? "Needs attention" : item.status === "active" ? "Active" : "Complete"}</button><div><strong>{item.title}</strong><p>{item.detail}</p><small>{[item.owner && `Owner: ${item.owner}`, item.due && `Due: ${item.due}`, item.value].filter(Boolean).join(" · ")}</small></div><button type="button" className="run-remove" aria-label={`Remove ${item.title}`} onClick={() => remove(activeView as Exclude<RunView, "overview" | "stock" | "sales">, item.id)}>×</button></article>)}{activeItems.length === 0 && <p className="run-empty">Nothing added yet. Use the form to create the first item.</p>}</section><form className="run-add-form" onSubmit={addItem}><p className="eyebrow">ADD ITEM</p><h3>Add to {views.find((view) => view.id === activeView)?.label}</h3><label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label><label>Details<textarea value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} /></label><label>Owner<input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></label><label>Due date or timing<input value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} placeholder="Friday, 30 days, monthly…" /></label><label>Value or amount<input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></label><label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}><option value="active">Active</option><option value="attention">Needs attention</option><option value="done">Complete</option></select></label><button className="button primary" type="submit">Add item <span>→</span></button></form></div>}
      <p className="run-core-note">This operating-core release stores data privately in this browser. Secure accounts, team permissions, cloud sync, payment processing and accounting integrations belong to the commercial backend stage.</p>
    </div>
  );
}
