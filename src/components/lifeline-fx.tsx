"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { appendJournal, readBooksStore, saveBooksStore, type LedgerJournal } from "@/lib/lifeline-books-engine";

export const LIFELINE_FX_KEY = "business-lifeline-fx-v1";

type FxTransaction = {
  id: string;
  kind: "receivable" | "payable";
  party: string;
  reference: string;
  date: string;
  due: string;
  currency: string;
  foreignAmount: number;
  issueRate: number;
  baseAmount: number;
  gstTreatment: "free" | "gst";
  status: "open" | "settled";
  settlementRate?: number;
  settlementDate?: string;
  settlementBaseAmount?: number;
};

type FxStore = { baseCurrency: string; transactions: FxTransaction[] };
const empty: FxStore = { baseCurrency: "AUD", transactions: [] };
const round = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const id = (prefix: string) => prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
const money = (value: number, currency = "AUD") => value.toLocaleString("en", { style: "currency", currency, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);

function readFx(): FxStore {
  try {
    const raw = localStorage.getItem(LIFELINE_FX_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<FxStore>;
    return { baseCurrency: parsed.baseCurrency || "AUD", transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [] };
  } catch { return empty; }
}
function postJournal(journal: LedgerJournal) {
  const result = appendJournal(readBooksStore(), journal);
  if (!result.added) return false;
  saveBooksStore(result.store);
  return true;
}

export function LifelineFx() {
  const [store, setStore] = useState<FxStore>(empty);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    kind: "receivable" as FxTransaction["kind"], party: "", reference: "", date: today(), due: "",
    currency: "USD", foreignAmount: 0, issueRate: 1.5, gstTreatment: "free" as FxTransaction["gstTreatment"],
  });

  useEffect(() => { setStore(readFx()); setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem(LIFELINE_FX_KEY, JSON.stringify(store)); }, [store, ready]);

  const openValue = useMemo(() => store.transactions.filter((item) => item.status === "open").reduce((sum, item) => sum + item.baseAmount, 0), [store.transactions]);
  const settled = store.transactions.filter((item) => item.status === "settled");

  const create = (event: FormEvent) => {
    event.preventDefault();
    if (!form.party.trim() || form.foreignAmount <= 0 || form.issueRate <= 0 || form.currency === store.baseCurrency) return;
    const baseAmount = round(form.foreignAmount * form.issueRate);
    const gst = form.gstTreatment === "gst" ? round(baseAmount / 11) : 0;
    const net = round(baseAmount - gst);
    const tx: FxTransaction = { id: id("fx"), ...form, party: form.party.trim(), baseAmount, status: "open" };
    const source = "FX:ISSUE:" + tx.id;
    const lines: LedgerJournal["lines"] = tx.kind === "receivable"
      ? [
          { account: "Accounts Receivable", side: "debit", amount: baseAmount },
          { account: "Sales Revenue", side: "credit", amount: net },
          ...(gst > 0 ? [{ account: "GST Payable", side: "credit" as const, amount: gst }] : []),
        ]
      : [
          { account: "Operating Expense", side: "debit", amount: net },
          ...(gst > 0 ? [{ account: "GST Input Credit", side: "debit" as const, amount: gst }] : []),
          { account: "Accounts Payable", side: "credit", amount: baseAmount },
        ];
    if (!postJournal({ id: id("journal"), date: tx.date, memo: "FX " + tx.kind + " · " + tx.party + " · " + tx.currency + " " + tx.foreignAmount, source, lines })) {
      setMessage("The foreign-currency transaction could not be posted. Check the period lock or existing record.");
      return;
    }
    setStore((current) => ({ ...current, transactions: [tx, ...current.transactions] }));
    setForm({ kind: "receivable", party: "", reference: "", date: today(), due: "", currency: "USD", foreignAmount: 0, issueRate: 1.5, gstTreatment: "free" });
    setMessage("Foreign-currency transaction posted to Lifeline Books in " + store.baseCurrency + ".");
  };

  const settle = (tx: FxTransaction) => {
    const raw = prompt("Settlement exchange rate: 1 " + tx.currency + " = how many " + store.baseCurrency + "?", String(tx.issueRate));
    if (raw === null) return;
    const rate = Number(raw);
    if (!Number.isFinite(rate) || rate <= 0) return;
    const settlementBaseAmount = round(tx.foreignAmount * rate);
    const difference = round(settlementBaseAmount - tx.baseAmount);
    const lines: LedgerJournal["lines"] = [];

    if (tx.kind === "receivable") {
      lines.push({ account: "Bank", side: "debit", amount: settlementBaseAmount });
      if (difference < 0) lines.push({ account: "Foreign Exchange Loss", side: "debit", amount: Math.abs(difference) });
      lines.push({ account: "Accounts Receivable", side: "credit", amount: tx.baseAmount });
      if (difference > 0) lines.push({ account: "Foreign Exchange Gain", side: "credit", amount: difference });
    } else {
      lines.push({ account: "Accounts Payable", side: "debit", amount: tx.baseAmount });
      if (difference > 0) lines.push({ account: "Foreign Exchange Loss", side: "debit", amount: difference });
      lines.push({ account: "Bank", side: "credit", amount: settlementBaseAmount });
      if (difference < 0) lines.push({ account: "Foreign Exchange Gain", side: "credit", amount: Math.abs(difference) });
    }

    const date = today();
    if (!postJournal({ id: id("journal"), date, memo: "FX settlement · " + tx.party + " · " + tx.reference, source: "FX:SETTLE:" + tx.id, lines })) {
      setMessage("Settlement could not be posted.");
      return;
    }
    setStore((current) => ({ ...current, transactions: current.transactions.map((item) => item.id === tx.id ? { ...item, status: "settled" as const, settlementRate: rate, settlementDate: date, settlementBaseAmount } : item) }));
    setMessage("Settlement posted and the exchange difference was recognised.");
  };

  return <section className="lifeline-product">
    <header className="lifeline-product-hero"><div><p className="eyebrow">LIFELINE FX</p><h2>Multi-currency without losing the base-currency books.</h2><p>Record foreign receivables/payables at the issue rate, settle them at the actual rate and let Lifeline Books recognise the exchange gain or loss.</p></div><div className="lifeline-integrity good"><strong>{money(openValue, store.baseCurrency)}</strong><span>Open foreign items in base currency</span></div></header>
    {message && <div className="os-notice"><span>{message}</span><button onClick={() => setMessage("")}>Dismiss</button></div>}

    <section className="panel"><label className="field"><span>Base reporting currency</span><select value={store.baseCurrency} onChange={(e) => setStore({ ...store, baseCurrency: e.target.value })}>{["AUD","NZD","USD","GBP","CAD","EUR","JPY","SGD"].map((currency) => <option key={currency}>{currency}</option>)}</select></label></section>

    <div className="lifeline-report-grid">
      <form className="panel fields" onSubmit={create}><p className="eyebrow">FOREIGN TRANSACTION</p><h3>Create receivable or payable</h3>
        <label className="field"><span>Type</span><select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as FxTransaction["kind"] })}><option value="receivable">Customer receivable</option><option value="payable">Supplier payable</option></select></label>
        <label className="field"><span>Customer / supplier</span><input value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })} required /></label>
        <label className="field"><span>Reference</span><input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></label>
        <div className="two-cols"><label className="field"><span>Date</span><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label className="field"><span>Due</span><input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} /></label></div>
        <div className="two-cols"><label className="field"><span>Currency</span><select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>{["NZD","USD","GBP","CAD","EUR","JPY","SGD","AUD"].filter((currency) => currency !== store.baseCurrency).map((currency) => <option key={currency}>{currency}</option>)}</select></label><label className="field"><span>Foreign amount</span><input type="number" min="0" step="0.01" value={form.foreignAmount || ""} onChange={(e) => setForm({ ...form, foreignAmount: Number(e.target.value) || 0 })} /></label></div>
        <label className="field"><span>Issue rate: 1 {form.currency} = {store.baseCurrency}</span><input type="number" min="0" step="0.000001" value={form.issueRate} onChange={(e) => setForm({ ...form, issueRate: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>GST treatment</span><select value={form.gstTreatment} onChange={(e) => setForm({ ...form, gstTreatment: e.target.value as FxTransaction["gstTreatment"] })}><option value="free">No GST in base ledger</option><option value="gst">GST included</option></select></label>
        <p>Base value: <strong>{money(round(form.foreignAmount * form.issueRate), store.baseCurrency)}</strong></p>
        <button className="button primary">Post foreign transaction</button>
      </form>

      <section className="panel"><p className="eyebrow">OPEN FX ITEMS</p><h3>Settle at the actual rate</h3><div className="item-list">
        {store.transactions.filter((item) => item.status === "open").map((item) => <article key={item.id}><div><strong>{item.party} · {item.reference || item.kind}</strong><span>{money(item.foreignAmount, item.currency)} · issue rate {item.issueRate} · due {item.due || "not set"}</span><small>Base value {money(item.baseAmount, store.baseCurrency)}</small></div><button type="button" onClick={() => settle(item)}>Settle</button></article>)}
      </div></section>
    </div>

    <section className="panel"><p className="eyebrow">SETTLED</p><h3>Exchange differences captured automatically</h3><div className="item-list">
      {settled.map((item) => <article key={item.id}><div><strong>{item.party} · {item.reference || item.kind}</strong><span>{money(item.foreignAmount, item.currency)} · issue {item.issueRate} → settlement {item.settlementRate}</span><small>Issue {money(item.baseAmount, store.baseCurrency)} · settled {money(item.settlementBaseAmount || 0, store.baseCurrency)}</small></div></article>)}
    </div></section>

    <aside className="urgent"><b>FX rate boundary</b><p>Lifeline FX records rates supplied by the user or business. Automatic market-rate feeds are optional external data rails; tax treatment of foreign transactions should be verified for the business.</p></aside>
  </section>;
}
