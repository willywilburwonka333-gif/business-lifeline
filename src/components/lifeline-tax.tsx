"use client";

import { useEffect, useMemo, useState } from "react";
import {
  gstSummary,
  appendJournal,
  readBooksStore,
  saveBooksStore,
  trialBalance,
  type LedgerJournal,
} from "@/lib/lifeline-books-engine";

export const LIFELINE_TAX_KEY = "business-lifeline-tax-v1";

type TaxPeriod = {
  id: string;
  start: string;
  end: string;
  dueDate: string;
  label: string;
  status: "draft" | "reviewed" | "externally-lodged" | "paid";
  gstOnSales: number;
  gstCredits: number;
  paygWithholding: number;
  instalmentOrIncomeTax: number;
  notes: string;
  createdAt: string;
};

type TaxStore = { periods: TaxPeriod[] };
const empty: TaxStore = { periods: [] };
const round = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const money = (value: number) => value.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const id = () => "tax-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);

function readTax(): TaxStore {
  try {
    const raw = localStorage.getItem(LIFELINE_TAX_KEY);
    return raw ? { ...empty, ...(JSON.parse(raw) as Partial<TaxStore>) } : empty;
  } catch { return empty; }
}

function postJournal(journal: LedgerJournal) {
  const result = appendJournal(readBooksStore(), journal);
  if (!result.added) return false;
  saveBooksStore(result.store);
  return true;
}

function balanceFor(account: string) {
  const row = trialBalance(readBooksStore()).find((item) => item.account.toLowerCase() === account.toLowerCase());
  return row?.balance ?? 0;
}

export function LifelineTax() {
  const [store, setStore] = useState<TaxStore>(empty);
  const [ready, setReady] = useState(false);
  const [period, setPeriod] = useState({ start: "", end: "", dueDate: "", label: "", paygWithholding: 0, instalmentOrIncomeTax: 0, notes: "" });
  const [revision, setRevision] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => { setStore(readTax()); setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem(LIFELINE_TAX_KEY, JSON.stringify(store)); }, [store, ready]);
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("business-lifeline-ledger-sync", refresh);
    return () => window.removeEventListener("business-lifeline-ledger-sync", refresh);
  }, []);

  const liabilities = useMemo(() => ({
    gst: Math.max(0, balanceFor("GST Payable") - Math.max(0, balanceFor("GST Input Credit"))),
    payg: Math.max(0, balanceFor("PAYG Withholding Payable")),
    super: Math.max(0, balanceFor("Superannuation Payable")),
    tax: Math.max(0, balanceFor("Tax Payable")),
  }), [revision, store.periods]);

  const preparePeriod = () => {
    if (!period.start || !period.end) return;
    const summary = gstSummary(readBooksStore(), period.start, period.end);
    const next: TaxPeriod = {
      id: id(), start: period.start, end: period.end, dueDate: period.dueDate, label: period.label.trim() || period.start + " to " + period.end,
      status: "draft", gstOnSales: summary.gstOnSales, gstCredits: summary.gstCredits,
      paygWithholding: Number(period.paygWithholding || 0), instalmentOrIncomeTax: Number(period.instalmentOrIncomeTax || 0),
      notes: period.notes, createdAt: new Date().toISOString(),
    };
    setStore((current) => ({ ...current, periods: [next, ...current.periods] }));
    setMessage("Tax period prepared from Lifeline Books. Review before marking it ready.");
  };

  const updateStatus = (item: TaxPeriod, status: TaxPeriod["status"]) =>
    setStore((current) => ({ ...current, periods: current.periods.map((periodItem) => periodItem.id === item.id ? { ...periodItem, status } : periodItem) }));

  const payPeriod = (item: TaxPeriod) => {
    const gstNet = round(item.gstOnSales - item.gstCredits);
    const lines: LedgerJournal["lines"] = [];
    if (item.gstOnSales > 0) lines.push({ account: "GST Payable", side: "debit", amount: item.gstOnSales });
    if (item.gstCredits > 0) lines.push({ account: "GST Input Credit", side: "credit", amount: item.gstCredits });
    if (item.paygWithholding > 0) lines.push({ account: "PAYG Withholding Payable", side: "debit", amount: item.paygWithholding });
    if (item.instalmentOrIncomeTax > 0) lines.push({ account: "Tax Payable", side: "debit", amount: item.instalmentOrIncomeTax });
    const cashSettlement = round(gstNet + item.paygWithholding + item.instalmentOrIncomeTax);
    if (cashSettlement > 0) lines.push({ account: "Bank", side: "credit", amount: cashSettlement });
    if (cashSettlement < 0) lines.push({ account: "Bank", side: "debit", amount: Math.abs(cashSettlement) });
    if (!lines.length) { setMessage("No tax settlement is recorded for this period."); return; }
    const journal: LedgerJournal = { id: "journal-" + Date.now(), date: today(), memo: "Tax payment " + item.label, source: "TAX:PAYMENT:" + item.id, lines };
    if (!postJournal(journal)) { setMessage("Tax payment could not be posted. Check the period lock or existing journal."); return; }
    updateStatus(item, "paid");
    setMessage("Tax payment posted to Lifeline Books.");
  };

  const payControlLiability = (account: string, label: string, amount: number) => {
    const value = round(Math.max(0, amount));
    if (value <= 0) { setMessage("No recorded " + label + " liability is available to pay."); return; }
    const journal: LedgerJournal = {
      id: "journal-" + Date.now(),
      date: today(),
      memo: label + " payment",
      source: "TAX:CONTROL-PAYMENT:" + account + ":" + Date.now(),
      lines: [{ account, side: "debit", amount: value }, { account: "Bank", side: "credit", amount: value }],
    };
    if (!postJournal(journal)) { setMessage(label + " payment could not be posted."); return; }
    setRevision((value) => value + 1);
    setMessage(label + " payment posted to Lifeline Books.");
  };

  const exportPeriod = (item: TaxPeriod) => {
    const summary = gstSummary(readBooksStore(), item.start, item.end);
    const payload = {
      product: "Lifeline Tax",
      period: { start: item.start, end: item.end, label: item.label },
      gst: {
        grossSalesIncludingGst: summary.taxableSales,
        gstOnSales: item.gstOnSales,
        gstFreeSales: summary.gstFreeSales,
        inputTaxedSales: summary.inputTaxedSales,
        purchasesIncludingGst: summary.purchasesIncludingGst,
        gstCredits: item.gstCredits,
        estimatedNetGst: round(item.gstOnSales - item.gstCredits),
      },
      paygWithholding: item.paygWithholding,
      instalmentOrIncomeTax: item.instalmentOrIncomeTax,
      notes: item.notes,
      disclaimer: "Preparation summary only. Confirm labels, tax treatment and lodgement with the applicable authority or registered adviser.",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lifeline-tax-" + item.start + "-" + item.end + ".json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return <section className="lifeline-product">
    <header className="lifeline-product-hero"><div><p className="eyebrow">LIFELINE TAX</p><h2>Tax preparation directly from Lifeline Books.</h2><p>GST, PAYG, super and tax liabilities stay visible beside the operating record instead of becoming a surprise at lodgement time.</p></div><div className="lifeline-integrity good"><strong>{money(liabilities.gst + liabilities.payg + liabilities.super + liabilities.tax)}</strong><span>Recorded tax/super liabilities</span></div></header>

    <section className="metric-grid">
      <article><span>GST liability</span><strong>{money(liabilities.gst)}</strong></article>
      <article><span>PAYG withholding</span><strong>{money(liabilities.payg)}</strong>{liabilities.payg > 0 && <button type="button" onClick={() => payControlLiability("PAYG Withholding Payable","PAYG withholding",liabilities.payg)}>Record payment</button>}</article>
      <article><span>Super payable</span><strong>{money(liabilities.super)}</strong>{liabilities.super > 0 && <button type="button" onClick={() => payControlLiability("Superannuation Payable","superannuation",liabilities.super)}>Record payment</button>}</article>
      <article><span>Other tax payable</span><strong>{money(liabilities.tax)}</strong>{liabilities.tax > 0 && <button type="button" onClick={() => payControlLiability("Tax Payable","tax",liabilities.tax)}>Record payment</button>}</article>
    </section>

    {message && <div className="os-notice"><span>{message}</span><button onClick={() => setMessage("")}>Dismiss</button></div>}

    <div className="lifeline-report-grid">
      <section className="panel fields"><p className="eyebrow">PREPARE PERIOD</p><h3>Create a BAS/tax workpaper</h3>
        <label className="field"><span>Period label</span><input value={period.label} onChange={(e) => setPeriod({ ...period, label: e.target.value })} placeholder="Example: Jul–Sep 2026" /></label>
        <label className="field"><span>Start</span><input type="date" value={period.start} onChange={(e) => setPeriod({ ...period, start: e.target.value })} /></label>
        <label className="field"><span>End</span><input type="date" value={period.end} onChange={(e) => setPeriod({ ...period, end: e.target.value })} /></label>
        <label className="field"><span>Payment / lodgement due date</span><input type="date" value={period.dueDate} onChange={(e) => setPeriod({ ...period, dueDate: e.target.value })} /></label><label className="field"><span>Payment / lodgement due date</span><input type="date" value={period.dueDate} onChange={(e) => setPeriod({ ...period, dueDate: e.target.value })} /></label>
        <label className="field"><span>PAYG withholding for period</span><input type="number" min="0" step="0.01" value={period.paygWithholding || ""} onChange={(e) => setPeriod({ ...period, paygWithholding: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Income-tax / PAYG instalment</span><input type="number" min="0" step="0.01" value={period.instalmentOrIncomeTax || ""} onChange={(e) => setPeriod({ ...period, instalmentOrIncomeTax: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Notes</span><textarea value={period.notes} onChange={(e) => setPeriod({ ...period, notes: e.target.value })} /></label>
        <button className="button primary" type="button" onClick={preparePeriod}>Prepare from Books</button>
      </section>

      <section className="panel"><p className="eyebrow">PERIODS</p><h3>Review → lodge → pay</h3><div className="item-list">
        {store.periods.map((item) => {
          const netGst = round(item.gstOnSales - item.gstCredits);
          const total = round(netGst + item.paygWithholding + item.instalmentOrIncomeTax);
          return <article key={item.id}><div><strong>{item.label}</strong><span>{item.start} → {item.end} · {item.status}{item.dueDate ? " · due " + item.dueDate : ""}</span><small>GST {money(netGst)} · PAYG {money(item.paygWithholding)} · tax instalment {money(item.instalmentOrIncomeTax)} · total {money(total)}</small></div><div><button type="button" onClick={() => exportPeriod(item)}>Export workpaper</button>{item.status === "draft" && <button type="button" onClick={() => updateStatus(item, "reviewed")}>Mark reviewed</button>}{item.status === "reviewed" && <button type="button" onClick={() => updateStatus(item, "externally-lodged")}>Record externally lodged</button>}{item.status === "externally-lodged" && <button type="button" onClick={() => payPeriod(item)}>Record payment</button>}</div></article>;
        })}
      </div></section>
    </div>

    <aside className="urgent"><b>Tax boundary</b><p>Lifeline Tax prepares the figures and workpapers. Direct BAS/ATO lodgement and tax-agent services require approved lodgement rails and professional verification; this module does not claim to replace those regulated services.</p></aside>
  </section>;
}
