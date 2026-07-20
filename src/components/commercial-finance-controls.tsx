"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const KEY = "business-lifeline-commercial-finance-controls-v1";
const ACCOUNTING_KEY = "business-lifeline-advanced-accounting-v1";

type BankAccount = { id: string; name: string; openingBalance: number; statementBalance: number };
type BankTransaction = { id: string; accountId: string; date: string; description: string; amount: number; direction: "in" | "out"; matchedSource: string; status: "unmatched" | "matched" | "ignored" };
type Recurring = { id: string; customer: string; description: string; amount: number; frequency: "weekly" | "fortnightly" | "monthly" | "quarterly" | "yearly"; nextDate: string; active: boolean; generated: number };
type Instalment = { id: string; customer: string; reference: string; total: number; deposit: number; paid: number; instalments: number; dueDate: string; status: "active" | "paid" };
type Store = { accounts: BankAccount[]; transactions: BankTransaction[]; recurring: Recurring[]; instalments: Instalment[] };
type JournalLine = { account: string; side: "debit" | "credit"; amount: number };
type Journal = { id: string; date: string; memo: string; lines: JournalLine[]; source: string };
type AccountingStore = { journals?: Journal[]; docs?: Array<Record<string, unknown>>; bills?: unknown[]; refunds?: unknown[]; nextQuote?: number; nextInvoice?: number; nextCredit?: number; lockDate?: string };

const empty: Store = { accounts: [{ id: "bank-main", name: "Main business account", openingBalance: 0, statementBalance: 0 }], transactions: [], recurring: [], instalments: [] };
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const money = (value: number) => value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
const round = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);

function readAccounting(): AccountingStore {
  try {
    const raw = localStorage.getItem(ACCOUNTING_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeJournal(journal: Journal) {
  const accounting = readAccounting();
  const journals = Array.isArray(accounting.journals) ? accounting.journals : [];
  if (journals.some((item) => item.source === journal.source)) return false;
  const debit = round(journal.lines.filter((line) => line.side === "debit").reduce((sum, line) => sum + line.amount, 0));
  const credit = round(journal.lines.filter((line) => line.side === "credit").reduce((sum, line) => sum + line.amount, 0));
  if (debit !== credit) return false;
  if (accounting.lockDate && journal.date <= accounting.lockDate) return false;
  localStorage.setItem(ACCOUNTING_KEY, JSON.stringify({
    ...accounting,
    journals: [journal, ...journals],
    docs: accounting.docs || [],
    bills: accounting.bills || [],
    refunds: accounting.refunds || [],
    nextQuote: accounting.nextQuote || 1,
    nextInvoice: accounting.nextInvoice || 1,
    nextCredit: accounting.nextCredit || 1,
    lockDate: accounting.lockDate || "",
  }));
  window.dispatchEvent(new CustomEvent("business-lifeline-ledger-sync", { detail: { changed: true } }));
  return true;
}

export function CommercialFinanceControls() {
  const [store, setStore] = useState<Store>(empty);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"banking" | "recurring" | "instalments" | "statements">("banking");
  const [bankTx, setBankTx] = useState({ accountId: "bank-main", date: "", description: "", amount: 0, direction: "in" as BankTransaction["direction"] });
  const [recurring, setRecurring] = useState({ customer: "", description: "", amount: 0, frequency: "monthly" as Recurring["frequency"], nextDate: "" });
  const [plan, setPlan] = useState({ customer: "", reference: "", total: 0, deposit: 0, instalments: 4, dueDate: "" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setStore({ ...empty, ...JSON.parse(raw) });
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(store));
  }, [store, ready]);

  const journalSources = useMemo(() => {
    const accounting = readAccounting();
    return (accounting.journals || []).map((journal) => ({ source: journal.source, date: journal.date, memo: journal.memo, amount: round(journal.lines.filter((line) => line.side === "debit").reduce((sum, line) => sum + line.amount, 0)) }));
  }, [store.transactions, tab]);

  const balances = useMemo(() => store.accounts.map((account) => {
    const movements = store.transactions.filter((tx) => tx.accountId === account.id && tx.status !== "ignored").reduce((sum, tx) => sum + (tx.direction === "in" ? tx.amount : -tx.amount), 0);
    const bookBalance = round(account.openingBalance + movements);
    return { ...account, bookBalance, difference: round(account.statementBalance - bookBalance) };
  }), [store]);

  const addBankTransaction = (event: FormEvent) => {
    event.preventDefault();
    if (!bankTx.description.trim() || bankTx.amount <= 0) return;
    setStore((current) => ({ ...current, transactions: [{ id: id("banktx"), ...bankTx, date: bankTx.date || today(), matchedSource: "", status: "unmatched" }, ...current.transactions] }));
    setBankTx({ accountId: bankTx.accountId, date: "", description: "", amount: 0, direction: "in" });
  };

  const matchTransaction = (transaction: BankTransaction, source: string) => {
    setStore((current) => ({ ...current, transactions: current.transactions.map((item) => item.id === transaction.id ? { ...item, matchedSource: source, status: "matched" } : item) }));
  };

  const settleCardClearing = (transaction: BankTransaction) => {
    const source = `BANK:CARD-SETTLEMENT:${transaction.id}`;
    const posted = writeJournal({ id: id("journal"), date: transaction.date, memo: `Card settlement ${transaction.description}`, source, lines: [
      { account: "Bank", side: "debit", amount: transaction.amount },
      { account: "Card Clearing", side: "credit", amount: transaction.amount },
    ] });
    if (posted) matchTransaction(transaction, source);
  };

  const addRecurring = (event: FormEvent) => {
    event.preventDefault();
    if (!recurring.customer.trim() || recurring.amount <= 0 || !recurring.nextDate) return;
    setStore((current) => ({ ...current, recurring: [{ id: id("recurring"), ...recurring, active: true, generated: 0 }, ...current.recurring] }));
    setRecurring({ customer: "", description: "", amount: 0, frequency: "monthly", nextDate: "" });
  };

  const generateRecurring = (rule: Recurring) => {
    const gst = round(rule.amount / 11);
    const net = round(rule.amount - gst);
    const source = `RECURRING:${rule.id}:${rule.nextDate}`;
    const posted = writeJournal({ id: id("journal"), date: rule.nextDate, memo: `Recurring invoice · ${rule.customer} · ${rule.description}`, source, lines: [
      { account: "Accounts Receivable", side: "debit", amount: rule.amount },
      { account: "Sales Revenue", side: "credit", amount: net },
      { account: "GST Payable", side: "credit", amount: gst },
    ] });
    if (!posted) return;
    const next = new Date(`${rule.nextDate}T00:00:00`);
    if (rule.frequency === "weekly") next.setDate(next.getDate() + 7);
    if (rule.frequency === "fortnightly") next.setDate(next.getDate() + 14);
    if (rule.frequency === "monthly") next.setMonth(next.getMonth() + 1);
    if (rule.frequency === "quarterly") next.setMonth(next.getMonth() + 3);
    if (rule.frequency === "yearly") next.setFullYear(next.getFullYear() + 1);
    setStore((current) => ({ ...current, recurring: current.recurring.map((item) => item.id === rule.id ? { ...item, generated: item.generated + 1, nextDate: next.toISOString().slice(0, 10) } : item) }));
  };

  const addPlan = (event: FormEvent) => {
    event.preventDefault();
    if (!plan.customer.trim() || plan.total <= 0 || plan.deposit < 0 || plan.deposit > plan.total) return;
    setStore((current) => ({ ...current, instalments: [{ id: id("plan"), ...plan, paid: plan.deposit, status: plan.deposit >= plan.total ? "paid" : "active" }, ...current.instalments] }));
    if (plan.deposit > 0) writeJournal({ id: id("journal"), date: today(), memo: `Deposit · ${plan.customer} · ${plan.reference}`, source: `DEPOSIT:${plan.customer}:${Date.now()}`, lines: [
      { account: "Bank", side: "debit", amount: plan.deposit },
      { account: "Customer Deposits", side: "credit", amount: plan.deposit },
    ] });
    setPlan({ customer: "", reference: "", total: 0, deposit: 0, instalments: 4, dueDate: "" });
  };

  const recordInstalment = (item: Instalment) => {
    const remaining = round(item.total - item.paid);
    const suggested = round(remaining / Math.max(1, item.instalments));
    const amount = Number(prompt(`Payment amount for ${item.customer}`, String(suggested)) || 0);
    if (amount <= 0) return;
    const actual = Math.min(remaining, amount);
    const source = `INSTALMENT:${item.id}:${item.paid + actual}`;
    if (!writeJournal({ id: id("journal"), date: today(), memo: `Instalment · ${item.customer} · ${item.reference}`, source, lines: [
      { account: "Bank", side: "debit", amount: actual },
      { account: "Accounts Receivable", side: "credit", amount: actual },
    ] })) return;
    setStore((current) => ({ ...current, instalments: current.instalments.map((planItem) => planItem.id === item.id ? { ...planItem, paid: round(planItem.paid + actual), status: planItem.paid + actual >= planItem.total ? "paid" : "active" } : planItem) }));
  };

  const customerStatement = (customer: string) => {
    const plans = store.instalments.filter((item) => item.customer === customer);
    const recurringRules = store.recurring.filter((item) => item.customer === customer);
    const total = plans.reduce((sum, item) => sum + item.total, 0);
    const paid = plans.reduce((sum, item) => sum + item.paid, 0);
    const win = window.open("", "_blank", "width=850,height=900");
    if (!win) return;
    win.document.write(`<html><head><title>Statement - ${customer}</title><style>body{font-family:Arial;padding:48px;color:#173244}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #ccd8de;text-align:left}</style></head><body><h1>Customer statement</h1><h2>${customer}</h2><p>Date ${new Date().toLocaleDateString("en-AU")}</p><table><tr><th>Reference</th><th>Total</th><th>Paid</th><th>Balance</th></tr>${plans.map((item) => `<tr><td>${item.reference}</td><td>${money(item.total)}</td><td>${money(item.paid)}</td><td>${money(item.total-item.paid)}</td></tr>`).join("")}</table><h3>Total owing ${money(total-paid)}</h3><p>Recurring arrangements: ${recurringRules.length}</p><script>window.print()</script></body></html>`);
    win.document.close();
  };

  const customers = [...new Set([...store.instalments.map((item) => item.customer), ...store.recurring.map((item) => item.customer)])];

  return <section className="commercial-finance-controls">
    <header><small>COMMERCIAL FINANCE CONTROLS</small><h2>Banking, reconciliation, recurring billing and payment plans</h2><p>Close the gap between operational accounting and real cash movement.</p></header>
    <nav>{([["banking", "Bank reconciliation"], ["recurring", "Recurring billing"], ["instalments", "Deposits & instalments"], ["statements", "Customer statements"]] as const).map(([key, label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}</nav>

    {tab === "banking" && <main>
      <div className="cfc-kpis">{balances.map((account) => <article key={account.id}><small>{account.name}</small><strong>{money(account.bookBalance)}</strong><span>Statement {money(account.statementBalance)}</span><b className={account.difference === 0 ? "ok" : "warn"}>Difference {money(account.difference)}</b><input type="number" step="0.01" value={account.statementBalance || ""} placeholder="Statement balance" onChange={(event) => setStore((current) => ({ ...current, accounts: current.accounts.map((item) => item.id === account.id ? { ...item, statementBalance: Number(event.target.value) } : item) }))}/></article>)}</div>
      <form onSubmit={addBankTransaction} className="cfc-form"><h3>Add/import bank line</h3><select value={bankTx.accountId} onChange={(event) => setBankTx({ ...bankTx, accountId: event.target.value })}>{store.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select><input type="date" value={bankTx.date} onChange={(event) => setBankTx({ ...bankTx, date: event.target.value })}/><input placeholder="Statement description" value={bankTx.description} onChange={(event) => setBankTx({ ...bankTx, description: event.target.value })}/><input type="number" step="0.01" placeholder="Amount" value={bankTx.amount || ""} onChange={(event) => setBankTx({ ...bankTx, amount: Number(event.target.value) })}/><select value={bankTx.direction} onChange={(event) => setBankTx({ ...bankTx, direction: event.target.value as BankTransaction["direction"] })}><option value="in">Money in</option><option value="out">Money out</option></select><button>Add statement line</button></form>
      <div className="cfc-list">{store.transactions.map((transaction) => <article key={transaction.id}><div><strong>{transaction.date} · {transaction.description}</strong><span>{transaction.direction === "in" ? "+" : "-"}{money(transaction.amount)} · {transaction.status}</span>{transaction.matchedSource && <small>{transaction.matchedSource}</small>}</div><div>{transaction.status === "unmatched" && transaction.direction === "in" && <button onClick={() => settleCardClearing(transaction)}>Settle card clearing</button>}{transaction.status === "unmatched" && <select defaultValue="" onChange={(event) => event.target.value && matchTransaction(transaction, event.target.value)}><option value="">Match ledger source…</option>{journalSources.filter((journal) => Math.abs(journal.amount - transaction.amount) < 0.01).map((journal) => <option key={journal.source} value={journal.source}>{journal.date} · {journal.memo}</option>)}</select>}<button onClick={() => setStore((current) => ({ ...current, transactions: current.transactions.map((item) => item.id === transaction.id ? { ...item, status: "ignored" } : item) }))}>Ignore</button></div></article>)}</div>
    </main>}

    {tab === "recurring" && <main><form onSubmit={addRecurring} className="cfc-form"><h3>Create recurring billing rule</h3><input placeholder="Customer" value={recurring.customer} onChange={(event) => setRecurring({ ...recurring, customer: event.target.value })}/><input placeholder="Description" value={recurring.description} onChange={(event) => setRecurring({ ...recurring, description: event.target.value })}/><input type="number" step="0.01" placeholder="Amount" value={recurring.amount || ""} onChange={(event) => setRecurring({ ...recurring, amount: Number(event.target.value) })}/><select value={recurring.frequency} onChange={(event) => setRecurring({ ...recurring, frequency: event.target.value as Recurring["frequency"] })}><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select><input type="date" value={recurring.nextDate} onChange={(event) => setRecurring({ ...recurring, nextDate: event.target.value })}/><button>Add recurring rule</button></form><div className="cfc-list">{store.recurring.map((rule) => <article key={rule.id}><div><strong>{rule.customer} · {rule.description}</strong><span>{money(rule.amount)} · {rule.frequency} · next {rule.nextDate}</span><small>{rule.generated} invoice journal{rule.generated === 1 ? "" : "s"} generated</small></div><div><button onClick={() => generateRecurring(rule)}>Generate now</button><button onClick={() => setStore((current) => ({ ...current, recurring: current.recurring.map((item) => item.id === rule.id ? { ...item, active: !item.active } : item) }))}>{rule.active ? "Pause" : "Resume"}</button></div></article>)}</div></main>}

    {tab === "instalments" && <main><form onSubmit={addPlan} className="cfc-form"><h3>Create deposit or instalment plan</h3><input placeholder="Customer" value={plan.customer} onChange={(event) => setPlan({ ...plan, customer: event.target.value })}/><input placeholder="Invoice/reference" value={plan.reference} onChange={(event) => setPlan({ ...plan, reference: event.target.value })}/><input type="number" step="0.01" placeholder="Contract total" value={plan.total || ""} onChange={(event) => setPlan({ ...plan, total: Number(event.target.value) })}/><input type="number" step="0.01" placeholder="Deposit received" value={plan.deposit || ""} onChange={(event) => setPlan({ ...plan, deposit: Number(event.target.value) })}/><input type="number" min="1" placeholder="Instalment count" value={plan.instalments} onChange={(event) => setPlan({ ...plan, instalments: Number(event.target.value) })}/><input type="date" value={plan.dueDate} onChange={(event) => setPlan({ ...plan, dueDate: event.target.value })}/><button>Create payment plan</button></form><div className="cfc-list">{store.instalments.map((item) => <article key={item.id}><div><strong>{item.customer} · {item.reference}</strong><span>Total {money(item.total)} · paid {money(item.paid)} · owing {money(item.total-item.paid)}</span><small>{item.instalments} instalments · due {item.dueDate || "not set"} · {item.status}</small></div>{item.status !== "paid" && <button onClick={() => recordInstalment(item)}>Record instalment</button>}</article>)}</div></main>}

    {tab === "statements" && <main><div className="cfc-list">{customers.map((customer) => { const plans = store.instalments.filter((item) => item.customer === customer); const owing = plans.reduce((sum, item) => sum + item.total - item.paid, 0); return <article key={customer}><div><strong>{customer}</strong><span>{plans.length} payment plan{plans.length === 1 ? "" : "s"} · owing {money(owing)}</span><small>{store.recurring.filter((item) => item.customer === customer).length} recurring rule{store.recurring.filter((item) => item.customer === customer).length === 1 ? "" : "s"}</small></div><button onClick={() => customerStatement(customer)}>Print/PDF statement</button></article> })}</div></main>}
  </section>;
}
