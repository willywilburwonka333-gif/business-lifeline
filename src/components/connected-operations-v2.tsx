"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  calculateStocktake,
  convertAcceptedQuote,
  createReorderDrafts,
  endOfDaySummary,
  invoiceFollowUp,
  nextQuoteStatus,
  type ConnectedInvoice,
  type ConnectedJob,
  type FollowUpTask,
  type QuoteStatus,
  type ReorderDraft,
} from "@/lib/connected-operations";

type View = "overview" | "customers" | "transactions" | "stocktake" | "market" | "team" | "rules";
type Customer = { id: string; name: string; contact: string; notes: string; createdAt: string };
type Quote = { id: string; customerId: string; customerName: string; description: string; amount: number; status: QuoteStatus; createdAt: string };
type Product = { id: string; name: string; sku: string; barcode: string; quantity: number; reorderAt: number; targetLevel: number; sellPrice: number; costPrice: number; supplier: string };
type Sale = { id: string; productId: string; productName: string; quantity: number; total: number; payment: string; soldAt: string };
type Expense = { id: string; supplier: string; category: string; amount: number; date: string; recurring: boolean };
type Timesheet = { id: string; person: string; date: string; start: string; end: string; breakMinutes: number; notes: string };
type Activity = { id: string; title: string; detail: string; createdAt: string };
type StocktakeSession = { id: string; createdAt: string; totalVariance: number; varianceValue: number };
type RuleSettings = { acceptedQuoteCreatesJob: boolean; overdueInvoiceCreatesTask: boolean; lowStockCreatesReorder: boolean; saleReducesStock: boolean };
type Store = {
  customers: Customer[];
  quotes: Quote[];
  jobs: ConnectedJob[];
  invoices: ConnectedInvoice[];
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  timesheets: Timesheet[];
  tasks: FollowUpTask[];
  reorders: ReorderDraft[];
  stocktakes: StocktakeSession[];
  activity: Activity[];
  rules: RuleSettings;
};

const STORAGE_KEY = "business-lifeline-connected-operations-v2";
const defaultRules: RuleSettings = { acceptedQuoteCreatesJob: true, overdueInvoiceCreatesTask: true, lowStockCreatesReorder: true, saleReducesStock: true };
const emptyStore: Store = { customers: [], quotes: [], jobs: [], invoices: [], products: [], sales: [], expenses: [], timesheets: [], tasks: [], reorders: [], stocktakes: [], activity: [], rules: defaultRules };
const tabs: Array<{ id: View; label: string; detail: string }> = [
  { id: "overview", label: "Overview", detail: "Connected alerts and activity" },
  { id: "customers", label: "Customers", detail: "CRM history and relationships" },
  { id: "transactions", label: "Quote → Job → Invoice", detail: "One connected transaction chain" },
  { id: "stocktake", label: "Stocktake", detail: "Count, reconcile and reorder" },
  { id: "market", label: "Market Day", detail: "Fast sales and end-of-day close" },
  { id: "team", label: "Timesheets", detail: "Hours and payroll preparation" },
  { id: "rules", label: "Automation Rules", detail: "Control what updates automatically" },
];

const nowIso = () => new Date().toISOString();
const activity = (title: string, detail: string): Activity => ({ id: `activity-${Date.now()}-${Math.random()}`, title, detail, createdAt: nowIso() });

function readStore(): Store {
  if (typeof window === "undefined") return emptyStore;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...emptyStore, ...(JSON.parse(raw) as Partial<Store>), rules: { ...defaultRules, ...(JSON.parse(raw) as Partial<Store>).rules } };

    const oldHub = JSON.parse(window.localStorage.getItem("business-lifeline-operating-automation-v1") ?? "null") as { customers?: Array<{ id: string; name: string; contact: string }>; quotes?: Array<{ id: string; customer: string; description: string; amount: number; status: QuoteStatus; createdAt: string }>; expenses?: Expense[] } | null;
    const oldRun = JSON.parse(window.localStorage.getItem("business-lifeline-run-operating-core-v2") ?? "null") as { stock?: Product[]; sales?: Sale[] } | null;
    if (!oldHub && !oldRun) return emptyStore;
    const customers = (oldHub?.customers ?? []).map((item) => ({ ...item, notes: "Imported from earlier CRM", createdAt: nowIso() }));
    const quotes = (oldHub?.quotes ?? []).map((item) => ({ ...item, customerId: customers.find((customer) => customer.name === item.customer)?.id ?? "", customerName: item.customer }));
    return { ...emptyStore, customers, quotes, products: oldRun?.stock ?? [], sales: oldRun?.sales ?? [], expenses: oldHub?.expenses ?? [], activity: [activity("Operating data connected", "Earlier CRM, quote, stock, sales and expense records were imported into the connected operating model.")] };
  } catch {
    return emptyStore;
  }
}

export function ConnectedOperationsV2() {
  const [view, setView] = useState<View>("overview");
  const [store, setStore] = useState<Store>(emptyStore);
  const [ready, setReady] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: "", contact: "", notes: "" });
  const [quoteForm, setQuoteForm] = useState({ customerId: "", description: "", amount: 0 });
  const [productForm, setProductForm] = useState({ name: "", sku: "", barcode: "", quantity: 0, reorderAt: 0, targetLevel: 0, sellPrice: 0, costPrice: 0, supplier: "" });
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [saleForm, setSaleForm] = useState({ productId: "", quantity: 1, payment: "Card" });
  const [expenseForm, setExpenseForm] = useState({ supplier: "", category: "Operating", amount: 0, date: "", recurring: false });
  const [timesheetForm, setTimesheetForm] = useState({ person: "", date: "", start: "", end: "", breakMinutes: 0, notes: "" });
  const [cashClose, setCashClose] = useState({ openingCash: 0, closingCash: 0 });

  useEffect(() => { setStore(readStore()); setReady(true); }, []);
  useEffect(() => { if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }, [store, ready]);

  const outstanding = useMemo(() => store.invoices.filter((invoice) => invoice.status !== "paid").reduce((sum, invoice) => sum + invoice.amount, 0), [store.invoices]);
  const lowStock = useMemo(() => store.products.filter((product) => product.quantity <= product.reorderAt), [store.products]);
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = useMemo(() => store.sales.filter((sale) => sale.soldAt.slice(0, 10) === today), [store.sales, today]);
  const todayExpenses = useMemo(() => store.expenses.filter((expense) => expense.date === today), [store.expenses, today]);
  const daySummary = useMemo(() => endOfDaySummary({ sales: todaySales, expenses: todayExpenses, openingCash: cashClose.openingCash, closingCash: cashClose.closingCash }), [todaySales, todayExpenses, cashClose]);

  const addCustomer = (event: FormEvent) => {
    event.preventDefault();
    if (!customerForm.name.trim()) return;
    const customer: Customer = { id: `customer-${Date.now()}`, ...customerForm, name: customerForm.name.trim(), createdAt: nowIso() };
    setStore((current) => ({ ...current, customers: [customer, ...current.customers], activity: [activity("Customer added", `${customer.name} was added to CRM.`), ...current.activity] }));
    setCustomerForm({ name: "", contact: "", notes: "" });
  };

  const addQuote = (event: FormEvent) => {
    event.preventDefault();
    const customer = store.customers.find((item) => item.id === quoteForm.customerId);
    if (!customer || quoteForm.amount <= 0) return;
    const quote: Quote = { id: `quote-${Date.now()}`, customerId: customer.id, customerName: customer.name, description: quoteForm.description, amount: quoteForm.amount, status: "draft", createdAt: nowIso() };
    setStore((current) => ({ ...current, quotes: [quote, ...current.quotes], activity: [activity("Quote created", `${customer.name} · ${quote.amount.toLocaleString("en-AU", { style: "currency", currency: "AUD" })}.`), ...current.activity] }));
    setQuoteForm({ customerId: "", description: "", amount: 0 });
  };

  const advanceQuote = (id: string) => setStore((current) => {
    const quote = current.quotes.find((item) => item.id === id);
    if (!quote) return current;
    const next = nextQuoteStatus(quote.status);
    let jobs = current.jobs;
    let invoices = current.invoices;
    const events = [activity(`Quote ${next}`, `${quote.customerName} · ${quote.amount.toLocaleString("en-AU", { style: "currency", currency: "AUD" })}.`), ...current.activity];
    if (next === "accepted" && current.rules.acceptedQuoteCreatesJob && !jobs.some((job) => job.id === `job-${quote.id}`)) {
      const converted = convertAcceptedQuote({ quoteId: quote.id, customerId: quote.customerId, customerName: quote.customerName, description: quote.description, amount: quote.amount, now: nowIso() });
      jobs = [converted.job, ...jobs];
      invoices = [converted.invoice, ...invoices];
      events.unshift(activity("Job and invoice prepared", `${quote.customerName}'s accepted quote created a planned job and draft invoice.`));
    }
    return { ...current, quotes: current.quotes.map((item) => item.id === id ? { ...item, status: next } : item), jobs, invoices, activity: events };
  });

  const advanceJob = (id: string) => setStore((current) => ({ ...current, jobs: current.jobs.map((job) => job.id === id ? { ...job, status: job.status === "planned" ? "active" : job.status === "active" ? "complete" : "complete" } : job), activity: [activity("Job updated", `${id} moved to its next delivery stage.`), ...current.activity] }));

  const advanceInvoice = (id: string) => setStore((current) => {
    const invoice = current.invoices.find((item) => item.id === id);
    if (!invoice) return current;
    const next: ConnectedInvoice["status"] = invoice.status === "draft" ? "sent" : invoice.status === "sent" || invoice.status === "overdue" ? "paid" : "paid";
    const updated = { ...invoice, status: next, paidAt: next === "paid" ? nowIso() : invoice.paidAt };
    return { ...current, invoices: current.invoices.map((item) => item.id === id ? updated : item), activity: [activity(`Invoice ${next}`, `${invoice.customerName} · ${invoice.amount.toLocaleString("en-AU", { style: "currency", currency: "AUD" })}.`), ...current.activity] };
  });

  const refreshAutomation = () => setStore((current) => {
    const tasks = current.rules.overdueInvoiceCreatesTask
      ? current.invoices.map((invoice) => invoiceFollowUp(invoice, nowIso())).filter((task): task is FollowUpTask => Boolean(task))
      : [];
    const reorders = current.rules.lowStockCreatesReorder ? createReorderDrafts(current.products) : [];
    const invoices = current.invoices.map((invoice) => invoiceFollowUp(invoice, nowIso()) && invoice.status === "sent" ? { ...invoice, status: "overdue" as const } : invoice);
    return { ...current, tasks, reorders, invoices, activity: [activity("Automation refreshed", `${tasks.length} overdue tasks and ${reorders.length} reorder drafts are ready.`), ...current.activity] };
  });

  const addProduct = (event: FormEvent) => {
    event.preventDefault();
    if (!productForm.name.trim()) return;
    const product: Product = { id: `product-${Date.now()}`, ...productForm, name: productForm.name.trim() };
    setStore((current) => ({ ...current, products: [product, ...current.products], activity: [activity("Product added", `${product.name} is now tracked in stock.`), ...current.activity] }));
    setProductForm({ name: "", sku: "", barcode: "", quantity: 0, reorderAt: 0, targetLevel: 0, sellPrice: 0, costPrice: 0, supplier: "" });
  };

  const completeStocktake = () => setStore((current) => {
    const results = calculateStocktake(current.products.map((product) => ({ productId: product.id, productName: product.name, expected: product.quantity, counted: counts[product.id] ?? product.quantity, costPrice: product.costPrice })));
    const totalVariance = results.reduce((sum, result) => sum + result.variance, 0);
    const varianceValue = results.reduce((sum, result) => sum + result.varianceValue, 0);
    const products = current.products.map((product) => ({ ...product, quantity: counts[product.id] ?? product.quantity }));
    const session: StocktakeSession = { id: `stocktake-${Date.now()}`, createdAt: nowIso(), totalVariance, varianceValue };
    return { ...current, products, stocktakes: [session, ...current.stocktakes], activity: [activity("Stocktake completed", `${totalVariance} unit variance · ${varianceValue.toLocaleString("en-AU", { style: "currency", currency: "AUD" })}.`), ...current.activity] };
  });

  const recordSale = (event: FormEvent) => {
    event.preventDefault();
    const product = store.products.find((item) => item.id === saleForm.productId);
    if (!product || saleForm.quantity < 1 || saleForm.quantity > product.quantity) return;
    const sale: Sale = { id: `sale-${Date.now()}`, productId: product.id, productName: product.name, quantity: saleForm.quantity, total: product.sellPrice * saleForm.quantity, payment: saleForm.payment, soldAt: nowIso() };
    setStore((current) => ({ ...current, products: current.rules.saleReducesStock ? current.products.map((item) => item.id === product.id ? { ...item, quantity: item.quantity - sale.quantity } : item) : current.products, sales: [sale, ...current.sales], activity: [activity("Sale recorded", `${sale.quantity} × ${product.name} · ${sale.total.toLocaleString("en-AU", { style: "currency", currency: "AUD" })}.`), ...current.activity] }));
    setSaleForm({ productId: "", quantity: 1, payment: "Card" });
  };

  const addExpense = (event: FormEvent) => {
    event.preventDefault();
    if (!expenseForm.supplier.trim() || expenseForm.amount <= 0) return;
    const expense: Expense = { id: `expense-${Date.now()}`, ...expenseForm, supplier: expenseForm.supplier.trim() };
    setStore((current) => ({ ...current, expenses: [expense, ...current.expenses], activity: [activity("Expense recorded", `${expense.supplier} · ${expense.amount.toLocaleString("en-AU", { style: "currency", currency: "AUD" })}.`), ...current.activity] }));
    setExpenseForm({ supplier: "", category: "Operating", amount: 0, date: "", recurring: false });
  };

  const addTimesheet = (event: FormEvent) => {
    event.preventDefault();
    if (!timesheetForm.person.trim()) return;
    const timesheet: Timesheet = { id: `timesheet-${Date.now()}`, ...timesheetForm, person: timesheetForm.person.trim() };
    setStore((current) => ({ ...current, timesheets: [timesheet, ...current.timesheets], activity: [activity("Timesheet added", `${timesheet.person} · ${timesheet.date}.`), ...current.activity] }));
    setTimesheetForm({ person: "", date: "", start: "", end: "", breakMinutes: 0, notes: "" });
  };

  const exportTimesheets = () => {
    const rows = ["Person,Date,Start,End,Break minutes,Notes", ...store.timesheets.map((item) => [item.person, item.date, item.start, item.end, item.breakMinutes, item.notes].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `business-lifeline-timesheets-${today}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const toggleRule = (key: keyof RuleSettings) => setStore((current) => ({ ...current, rules: { ...current.rules, [key]: !current.rules[key] } }));

  return <section className="connected-v2">
    <div className="connected-v2-hero"><div><p className="eyebrow">CONNECTED OPERATIONS V2</p><h2>One record drives the next action.</h2><p>Customers, quotes, jobs, invoices, stock, market sales, tasks and timesheets now share one connected operating model.</p></div><div className="connected-v2-metrics"><span><strong>{store.customers.length}</strong><small>Customers</small></span><span><strong>{outstanding.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })}</strong><small>Outstanding</small></span><span><strong>{lowStock.length}</strong><small>Low stock</small></span></div></div>
    <nav className="connected-v2-nav">{tabs.map((tab) => <button key={tab.id} type="button" className={view === tab.id ? "active" : ""} onClick={() => setView(tab.id)}><strong>{tab.label}</strong><small>{tab.detail}</small></button>)}</nav>

    {view === "overview" && <div className="connected-v2-grid"><section className="connected-card"><div className="section-heading"><div><p className="eyebrow">ATTENTION</p><h3>What needs action</h3></div><button className="button ghost" type="button" onClick={refreshAutomation}>Refresh automation</button></div>{store.tasks.map((task) => <article className="connected-alert" key={task.id}><strong>{task.title}</strong><p>{task.detail}</p></article>)}{store.reorders.map((draft) => <article className="connected-alert" key={draft.productId}><strong>Reorder {draft.productName}</strong><p>{draft.quantity} units from {draft.supplier} · estimated {draft.estimatedCost.toLocaleString("en-AU", { style: "currency", currency: "AUD" })}</p></article>)}{store.tasks.length + store.reorders.length === 0 && <p>No automated alerts are waiting.</p>}</section><section className="connected-card"><p className="eyebrow">ACTIVITY</p><h3>Connected updates</h3>{store.activity.slice(0, 12).map((item) => <article key={item.id}><strong>{item.title}</strong><p>{item.detail}</p><small>{new Date(item.createdAt).toLocaleString()}</small></article>)}</section></div>}

    {view === "customers" && <div className="connected-v2-grid"><section className="connected-card"><p className="eyebrow">CRM</p><h3>Customer history</h3>{store.customers.map((customer) => <article key={customer.id}><strong>{customer.name}</strong><p>{customer.contact || "No contact details"}</p><small>{customer.notes || "No notes"} · {store.quotes.filter((quote) => quote.customerId === customer.id).length} quotes · {store.jobs.filter((job) => job.customerId === customer.id).length} jobs</small></article>)}{store.customers.length === 0 && <p>No customers added yet.</p>}</section><form className="connected-form" onSubmit={addCustomer}><p className="eyebrow">ADD CUSTOMER</p><label>Name<input value={customerForm.name} onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })} required /></label><label>Contact<input value={customerForm.contact} onChange={(event) => setCustomerForm({ ...customerForm, contact: event.target.value })} /></label><label>Notes<textarea value={customerForm.notes} onChange={(event) => setCustomerForm({ ...customerForm, notes: event.target.value })} /></label><button className="button primary">Add customer</button></form></div>}

    {view === "transactions" && <div className="connected-v2-stack"><div className="connected-v2-grid"><section className="connected-card"><p className="eyebrow">QUOTES</p><h3>Move work from interest to paid</h3>{store.quotes.map((quote) => <article className="connected-row" key={quote.id}><div><strong>{quote.customerName}</strong><p>{quote.description}</p><small>{quote.status} · {quote.amount.toLocaleString("en-AU", { style: "currency", currency: "AUD" })}</small></div><button type="button" onClick={() => advanceQuote(quote.id)}>Advance</button></article>)}{store.quotes.length === 0 && <p>No quotes yet.</p>}</section><form className="connected-form" onSubmit={addQuote}><p className="eyebrow">CREATE QUOTE</p><label>Customer<select value={quoteForm.customerId} onChange={(event) => setQuoteForm({ ...quoteForm, customerId: event.target.value })} required><option value="">Choose customer</option>{store.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label><label>Description<textarea value={quoteForm.description} onChange={(event) => setQuoteForm({ ...quoteForm, description: event.target.value })} /></label><label>Amount<input type="number" min="0" step="0.01" value={quoteForm.amount} onChange={(event) => setQuoteForm({ ...quoteForm, amount: Number(event.target.value) })} /></label><button className="button primary">Create quote</button></form></div><div className="connected-v2-grid"><section className="connected-card"><p className="eyebrow">JOBS</p><h3>Delivery created from accepted quotes</h3>{store.jobs.map((job) => <article className="connected-row" key={job.id}><div><strong>{job.title}</strong><p>{job.customerName}</p><small>{job.status} · {job.value.toLocaleString("en-AU", { style: "currency", currency: "AUD" })}</small></div><button type="button" onClick={() => advanceJob(job.id)}>Advance</button></article>)}</section><section className="connected-card"><p className="eyebrow">INVOICES</p><h3>Due dates and payment follow-up</h3>{store.invoices.map((invoice) => <article className={`connected-row ${invoice.status === "overdue" ? "attention" : ""}`} key={invoice.id}><div><strong>{invoice.customerName}</strong><p>Due {new Date(invoice.dueAt).toLocaleDateString("en-AU")}</p><small>{invoice.status} · {invoice.amount.toLocaleString("en-AU", { style: "currency", currency: "AUD" })}</small></div><button type="button" onClick={() => advanceInvoice(invoice.id)}>{invoice.status === "draft" ? "Send" : "Mark paid"}</button></article>)}</section></div></div>}

    {view === "stocktake" && <div className="connected-v2-grid"><section className="connected-card"><div className="section-heading"><div><p className="eyebrow">STOCKTAKE</p><h3>Expected versus counted</h3></div><button className="button primary" type="button" onClick={completeStocktake} disabled={store.products.length === 0}>Complete stocktake</button></div>{store.products.map((product) => <label className="stocktake-line" key={product.id}><span><strong>{product.name}</strong><small>Expected {product.quantity}</small></span><input type="number" min="0" value={counts[product.id] ?? product.quantity} onChange={(event) => setCounts({ ...counts, [product.id]: Number(event.target.value) })} /></label>)}{store.stocktakes.slice(0, 5).map((session) => <article key={session.id}><strong>{new Date(session.createdAt).toLocaleString()}</strong><p>{session.totalVariance} unit variance · {session.varianceValue.toLocaleString("en-AU", { style: "currency", currency: "AUD" })}</p></article>)}</section><form className="connected-form" onSubmit={addProduct}><p className="eyebrow">ADD PRODUCT</p>{Object.entries(productForm).map(([key, value]) => key === "name" || key === "sku" || key === "barcode" || key === "supplier" ? <label key={key}>{key}<input value={String(value)} onChange={(event) => setProductForm({ ...productForm, [key]: event.target.value })} required={key === "name"} /></label> : <label key={key}>{key}<input type="number" min="0" step={key.includes("Price") ? "0.01" : "1"} value={Number(value)} onChange={(event) => setProductForm({ ...productForm, [key]: Number(event.target.value) })} /></label>)}<button className="button primary">Add product</button></form></div>}

    {view === "market" && <div className="connected-v2-stack"><div className="connected-v2-grid"><section className="connected-card"><p className="eyebrow">FAST SALES</p><h3>Market and counter register</h3>{todaySales.map((sale) => <article key={sale.id}><strong>{sale.productName}</strong><p>{sale.quantity} sold · {sale.payment}</p><small>{sale.total.toLocaleString("en-AU", { style: "currency", currency: "AUD" })}</small></article>)}</section><form className="connected-form" onSubmit={recordSale}><label>Product<select value={saleForm.productId} onChange={(event) => setSaleForm({ ...saleForm, productId: event.target.value })} required><option value="">Choose product</option>{store.products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.quantity} available</option>)}</select></label><label>Quantity<input type="number" min="1" value={saleForm.quantity} onChange={(event) => setSaleForm({ ...saleForm, quantity: Number(event.target.value) })} /></label><label>Payment<select value={saleForm.payment} onChange={(event) => setSaleForm({ ...saleForm, payment: event.target.value })}><option>Card</option><option>Cash</option><option>Bank transfer</option><option>Online</option><option>Other</option></select></label><button className="button primary">Record sale</button></form></div><div className="connected-v2-grid"><section className="connected-card"><p className="eyebrow">END OF DAY</p><h3>Cash and sales reconciliation</h3><div className="connected-summary"><span><strong>{daySummary.salesTotal.toLocaleString("en-AU", { style: "currency", currency: "AUD" })}</strong><small>Sales</small></span><span><strong>{daySummary.netTakings.toLocaleString("en-AU", { style: "currency", currency: "AUD" })}</strong><small>Net takings</small></span><span><strong>{daySummary.cashVariance.toLocaleString("en-AU", { style: "currency", currency: "AUD" })}</strong><small>Cash variance</small></span></div></section><form className="connected-form" onSubmit={addExpense}><p className="eyebrow">EXPENSE / CASH CLOSE</p><label>Opening cash<input type="number" value={cashClose.openingCash} onChange={(event) => setCashClose({ ...cashClose, openingCash: Number(event.target.value) })} /></label><label>Closing cash<input type="number" value={cashClose.closingCash} onChange={(event) => setCashClose({ ...cashClose, closingCash: Number(event.target.value) })} /></label><label>Supplier<input value={expenseForm.supplier} onChange={(event) => setExpenseForm({ ...expenseForm, supplier: event.target.value })} /></label><label>Category<input value={expenseForm.category} onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })} /></label><label>Amount<input type="number" min="0" step="0.01" value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: Number(event.target.value) })} /></label><label>Date<input type="date" value={expenseForm.date} onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })} /></label><label><span><input type="checkbox" checked={expenseForm.recurring} onChange={(event) => setExpenseForm({ ...expenseForm, recurring: event.target.checked })} /> Recurring expense</span></label><button className="button primary">Record expense</button></form></div></div>}

    {view === "team" && <div className="connected-v2-grid"><section className="connected-card"><div className="section-heading"><div><p className="eyebrow">TIMESHEETS</p><h3>Payroll preparation</h3></div><button className="button ghost" type="button" onClick={exportTimesheets}>Export CSV</button></div>{store.timesheets.map((item) => <article key={item.id}><strong>{item.person}</strong><p>{item.date} · {item.start}-{item.end}</p><small>{item.breakMinutes} minute break · {item.notes}</small></article>)}</section><form className="connected-form" onSubmit={addTimesheet}><label>Person<input value={timesheetForm.person} onChange={(event) => setTimesheetForm({ ...timesheetForm, person: event.target.value })} required /></label><label>Date<input type="date" value={timesheetForm.date} onChange={(event) => setTimesheetForm({ ...timesheetForm, date: event.target.value })} /></label><label>Start<input type="time" value={timesheetForm.start} onChange={(event) => setTimesheetForm({ ...timesheetForm, start: event.target.value })} /></label><label>End<input type="time" value={timesheetForm.end} onChange={(event) => setTimesheetForm({ ...timesheetForm, end: event.target.value })} /></label><label>Break minutes<input type="number" min="0" value={timesheetForm.breakMinutes} onChange={(event) => setTimesheetForm({ ...timesheetForm, breakMinutes: Number(event.target.value) })} /></label><label>Notes<textarea value={timesheetForm.notes} onChange={(event) => setTimesheetForm({ ...timesheetForm, notes: event.target.value })} /></label><button className="button primary">Add timesheet</button></form></div>}

    {view === "rules" && <section className="connected-card rules-card"><p className="eyebrow">AUTOMATION RULES</p><h3>Control what the operating system does automatically</h3>{(Object.keys(store.rules) as Array<keyof RuleSettings>).map((key) => <label key={key}><input type="checkbox" checked={store.rules[key]} onChange={() => toggleRule(key)} /><span><strong>{key.replaceAll(/([A-Z])/g, " $1")}</strong><small>{key === "acceptedQuoteCreatesJob" ? "Accepted quotes create a linked job and draft invoice." : key === "overdueInvoiceCreatesTask" ? "Overdue invoices create urgent follow-up tasks." : key === "lowStockCreatesReorder" ? "Low stock creates supplier reorder drafts." : "Sales reduce the linked stock quantity."}</small></span></label>)}</section>}
  </section>;
}
