"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  LIFELINE_BOOKS_KEY,
  readBooksStore,
  type BooksStore,
  type LedgerJournal,
  type SupplierBill,
} from "@/lib/lifeline-books-engine";

export const LIFELINE_SPEND_KEY = "business-lifeline-spend-v1";

type PurchaseOrder = {
  id: string;
  number: string;
  supplier: string;
  description: string;
  category: string;
  amount: number;
  gstIncluded: boolean;
  dueDate: string;
  status: "draft" | "approved" | "ordered" | "received" | "billed" | "cancelled";
  createdAt: string;
};

type ExpenseClaim = {
  id: string;
  person: string;
  merchant: string;
  date: string;
  category: string;
  amount: number;
  gstIncluded: boolean;
  receiptReference: string;
  notes: string;
  status: "draft" | "submitted" | "approved" | "reimbursed" | "declined";
};

type SpendStore = {
  purchaseOrders: PurchaseOrder[];
  claims: ExpenseClaim[];
  nextPo: number;
};

const empty: SpendStore = { purchaseOrders: [], claims: [], nextPo: 1 };
const round = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const money = (value: number) => value.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const id = (prefix: string) => prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);

function readSpend(): SpendStore {
  try {
    const raw = localStorage.getItem(LIFELINE_SPEND_KEY);
    return raw ? { ...empty, ...(JSON.parse(raw) as Partial<SpendStore>) } : empty;
  } catch { return empty; }
}

function saveBooks(store: BooksStore) {
  localStorage.setItem(LIFELINE_BOOKS_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent("business-lifeline-ledger-sync", { detail: { changed: true } }));
}

function postJournal(journal: LedgerJournal) {
  const books = readBooksStore();
  if (books.journals.some((item) => item.source === journal.source)) return false;
  const debit = round(journal.lines.filter((line) => line.side === "debit").reduce((sum, line) => sum + line.amount, 0));
  const credit = round(journal.lines.filter((line) => line.side === "credit").reduce((sum, line) => sum + line.amount, 0));
  if (debit !== credit || debit <= 0 || (books.lockDate && journal.date <= books.lockDate)) return false;
  saveBooks({ ...books, journals: [journal, ...books.journals] });
  return true;
}

function expenseLines(category: string, total: number, gstIncluded: boolean, creditAccount: string): LedgerJournal["lines"] {
  const gst = gstIncluded ? round(total / 11) : 0;
  const net = round(total - gst);
  return [
    { account: category || "Operating Expense", side: "debit", amount: net },
    ...(gst > 0 ? [{ account: "GST Input Credit", side: "debit" as const, amount: gst }] : []),
    { account: creditAccount, side: "credit", amount: total },
  ];
}

export function LifelineSpend() {
  const [store, setStore] = useState<SpendStore>(empty);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [po, setPo] = useState({ supplier: "", description: "", category: "Operating Expense", amount: 0, gstIncluded: true, dueDate: "" });
  const [claim, setClaim] = useState({ person: "", merchant: "", date: today(), category: "Operating Expense", amount: 0, gstIncluded: true, receiptReference: "", notes: "" });

  useEffect(() => { setStore(readSpend()); setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem(LIFELINE_SPEND_KEY, JSON.stringify(store)); }, [store, ready]);

  const committed = useMemo(() => store.purchaseOrders.filter((item) => !["billed", "cancelled"].includes(item.status)).reduce((sum, item) => sum + item.amount, 0), [store.purchaseOrders]);
  const claimsOutstanding = useMemo(() => store.claims.filter((item) => ["submitted", "approved"].includes(item.status)).reduce((sum, item) => sum + item.amount, 0), [store.claims]);
  const approvedClaims = store.claims.filter((item) => item.status === "approved");

  const addPo = (event: FormEvent) => {
    event.preventDefault();
    if (!po.supplier.trim() || !po.description.trim() || po.amount <= 0) return;
    setStore((current) => {
      const number = "PO-" + String(current.nextPo).padStart(5, "0");
      const order: PurchaseOrder = { id: id("po"), number, ...po, supplier: po.supplier.trim(), description: po.description.trim(), status: "draft", createdAt: new Date().toISOString() };
      return { ...current, nextPo: current.nextPo + 1, purchaseOrders: [order, ...current.purchaseOrders] };
    });
    setPo({ supplier: "", description: "", category: "Operating Expense", amount: 0, gstIncluded: true, dueDate: "" });
  };

  const advancePo = (order: PurchaseOrder) => {
    const next: PurchaseOrder["status"] =
      order.status === "draft" ? "approved" :
      order.status === "approved" ? "ordered" :
      order.status === "ordered" ? "received" :
      order.status === "received" ? "billed" : order.status;

    if (order.status === "received") {
      const books = readBooksStore();
      const gst = order.gstIncluded ? round(order.amount / 11) : 0;
      const bill: SupplierBill = {
        id: id("bill"),
        number: order.number,
        supplier: order.supplier,
        date: today(),
        due: order.dueDate,
        amount: order.amount,
        gst,
        status: "approved",
        paid: 0,
      };
      const source = "SPEND:PO:" + order.id;
      if (books.journals.some((journal) => journal.source === source)) {
        setMessage("This purchase order is already in Lifeline Books.");
      } else {
        const journal: LedgerJournal = { id: id("journal"), date: today(), memo: order.number + " · " + order.supplier, source, lines: expenseLines(order.category, order.amount, order.gstIncluded, "Accounts Payable") };
        const debit = round(journal.lines.filter((line) => line.side === "debit").reduce((sum, line) => sum + line.amount, 0));
        const credit = round(journal.lines.filter((line) => line.side === "credit").reduce((sum, line) => sum + line.amount, 0));
        if (debit !== credit || (books.lockDate && journal.date <= books.lockDate)) { setMessage("The received PO could not be posted because the ledger is locked or unbalanced."); return; }
        saveBooks({ ...books, bills: [bill, ...books.bills], journals: [journal, ...books.journals] });
        setMessage(order.number + " became a supplier bill in Lifeline Books.");
      }
    }

    setStore((current) => ({ ...current, purchaseOrders: current.purchaseOrders.map((item) => item.id === order.id ? { ...item, status: next } : item) }));
  };

  const addClaim = (event: FormEvent) => {
    event.preventDefault();
    if (!claim.person.trim() || !claim.merchant.trim() || claim.amount <= 0) return;
    const next: ExpenseClaim = { id: id("claim"), ...claim, person: claim.person.trim(), merchant: claim.merchant.trim(), status: "draft" };
    setStore((current) => ({ ...current, claims: [next, ...current.claims] }));
    setClaim({ person: "", merchant: "", date: today(), category: "Operating Expense", amount: 0, gstIncluded: true, receiptReference: "", notes: "" });
  };

  const advanceClaim = (item: ExpenseClaim) => {
    if (item.status === "draft") {
      setStore((current) => ({ ...current, claims: current.claims.map((claimItem) => claimItem.id === item.id ? { ...claimItem, status: "submitted" } : claimItem) }));
      return;
    }
    if (item.status === "submitted") {
      const journal: LedgerJournal = {
        id: id("journal"), date: item.date || today(), memo: "Expense claim · " + item.person + " · " + item.merchant,
        source: "SPEND:CLAIM:" + item.id,
        lines: expenseLines(item.category, item.amount, item.gstIncluded, "Employee Reimbursements Payable"),
      };
      if (!postJournal(journal)) { setMessage("Claim could not be approved into Books. Check the period lock or existing journal."); return; }
      setStore((current) => ({ ...current, claims: current.claims.map((claimItem) => claimItem.id === item.id ? { ...claimItem, status: "approved" } : claimItem) }));
      setMessage("Expense claim approved and posted to Lifeline Books.");
      return;
    }
    if (item.status === "approved") {
      const journal: LedgerJournal = {
        id: id("journal"), date: today(), memo: "Reimbursement · " + item.person,
        source: "SPEND:REIMBURSE:" + item.id,
        lines: [{ account: "Employee Reimbursements Payable", side: "debit", amount: item.amount }, { account: "Bank", side: "credit", amount: item.amount }],
      };
      if (!postJournal(journal)) { setMessage("Reimbursement could not be posted."); return; }
      setStore((current) => ({ ...current, claims: current.claims.map((claimItem) => claimItem.id === item.id ? { ...claimItem, status: "reimbursed" } : claimItem) }));
      setMessage("Reimbursement posted to Lifeline Books.");
    }
  };

  return <section className="lifeline-product">
    <header className="lifeline-product-hero"><div><p className="eyebrow">LIFELINE SPEND</p><h2>Control spend before it becomes a surprise.</h2><p>Purchase orders, supplier commitments and employee expense claims feed Lifeline Books only when the accounting event actually occurs.</p></div><div className="lifeline-integrity good"><strong>{money(committed)}</strong><span>Open purchasing commitments</span></div></header>

    {message && <div className="os-notice"><span>{message}</span><button onClick={() => setMessage("")}>Dismiss</button></div>}

    <section className="metric-grid">
      <article><span>Open purchase orders</span><strong>{store.purchaseOrders.filter((item) => !["billed","cancelled"].includes(item.status)).length}</strong></article>
      <article><span>Committed spend</span><strong>{money(committed)}</strong></article>
      <article><span>Claims awaiting action</span><strong>{store.claims.filter((item) => ["draft","submitted","approved"].includes(item.status)).length}</strong></article>
      <article><span>Claim value outstanding</span><strong>{money(claimsOutstanding)}</strong></article>
    </section>

    <div className="lifeline-report-grid">
      <form className="panel fields" onSubmit={addPo}><p className="eyebrow">PURCHASE ORDER</p><h3>Approve before spending</h3>
        <label className="field"><span>Supplier</span><input value={po.supplier} onChange={(e) => setPo({ ...po, supplier: e.target.value })} required /></label>
        <label className="field"><span>Description</span><textarea value={po.description} onChange={(e) => setPo({ ...po, description: e.target.value })} /></label>
        <label className="field"><span>Expense / asset account</span><input value={po.category} onChange={(e) => setPo({ ...po, category: e.target.value })} /></label>
        <label className="field"><span>Total</span><input type="number" min="0" step="0.01" value={po.amount || ""} onChange={(e) => setPo({ ...po, amount: Number(e.target.value) || 0 })} /></label>
        <label><input type="checkbox" checked={po.gstIncluded} onChange={(e) => setPo({ ...po, gstIncluded: e.target.checked })} /> GST included</label>
        <label className="field"><span>Expected due / payment date</span><input type="date" value={po.dueDate} onChange={(e) => setPo({ ...po, dueDate: e.target.value })} /></label>
        <button className="button primary">Create purchase order</button>
      </form>

      <section className="panel"><p className="eyebrow">PURCHASE ORDERS</p><h3>Draft → approved → ordered → received → billed</h3><div className="item-list">
        {store.purchaseOrders.map((item) => <article key={item.id}><div><strong>{item.number} · {item.supplier}</strong><span>{item.description}</span><small>{money(item.amount)} · {item.status} · {item.category}</small></div><div>{!["billed","cancelled"].includes(item.status) && <button type="button" onClick={() => advancePo(item)}>{item.status === "received" ? "Create supplier bill" : "Advance"}</button>}<button type="button" onClick={() => setStore((current) => ({ ...current, purchaseOrders: current.purchaseOrders.map((poItem) => poItem.id === item.id ? { ...poItem, status: "cancelled" } : poItem) }))}>Cancel</button></div></article>)}
      </div></section>
    </div>

    <div className="lifeline-report-grid">
      <form className="panel fields" onSubmit={addClaim}><p className="eyebrow">EXPENSE CLAIM</p><h3>Staff reimbursement</h3>
        <label className="field"><span>Person</span><input value={claim.person} onChange={(e) => setClaim({ ...claim, person: e.target.value })} required /></label>
        <label className="field"><span>Merchant</span><input value={claim.merchant} onChange={(e) => setClaim({ ...claim, merchant: e.target.value })} required /></label>
        <label className="field"><span>Date</span><input type="date" value={claim.date} onChange={(e) => setClaim({ ...claim, date: e.target.value })} /></label>
        <label className="field"><span>Category</span><input value={claim.category} onChange={(e) => setClaim({ ...claim, category: e.target.value })} /></label>
        <label className="field"><span>Amount</span><input type="number" min="0" step="0.01" value={claim.amount || ""} onChange={(e) => setClaim({ ...claim, amount: Number(e.target.value) || 0 })} /></label>
        <label><input type="checkbox" checked={claim.gstIncluded} onChange={(e) => setClaim({ ...claim, gstIncluded: e.target.checked })} /> GST included</label>
        <label className="field"><span>Lifeline Vault receipt reference</span><input value={claim.receiptReference} onChange={(e) => setClaim({ ...claim, receiptReference: e.target.value })} placeholder="Vault record name or reference" /></label>
        <label className="field"><span>Notes</span><textarea value={claim.notes} onChange={(e) => setClaim({ ...claim, notes: e.target.value })} /></label>
        <button className="button primary">Save claim</button>
      </form>

      <section className="panel"><p className="eyebrow">CLAIMS</p><h3>Submit → approve → reimburse</h3><div className="item-list">
        {store.claims.map((item) => <article key={item.id}><div><strong>{item.person} · {item.merchant}</strong><span>{item.date} · {item.category} · {item.status}</span><small>{money(item.amount)}{item.receiptReference ? " · receipt " + item.receiptReference : ""}</small></div><div>{!["reimbursed","declined"].includes(item.status) && <button type="button" onClick={() => advanceClaim(item)}>{item.status === "draft" ? "Submit" : item.status === "submitted" ? "Approve to Books" : "Reimburse"}</button>}<button type="button" onClick={() => setStore((current) => ({ ...current, claims: current.claims.map((claimItem) => claimItem.id === item.id ? { ...claimItem, status: "declined" } : claimItem) }))}>Decline</button></div></article>)}
      </div>{approvedClaims.length > 0 && <small>{approvedClaims.length} approved claim(s) are waiting for reimbursement.</small>}</section>
    </div>
  </section>;
}
