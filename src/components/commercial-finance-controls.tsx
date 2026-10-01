"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { appendJournal, readBooksStore, saveBooksStore, type LedgerJournal } from "@/lib/lifeline-books-engine";

const KEY = "business-lifeline-commercial-finance-controls-v1";
const ACCOUNTING_KEY = "business-lifeline-advanced-accounting-v1";
const BOOKS_SETTINGS_KEY = "business-lifeline-books-settings-v1";

type BankAccount = { id: string; name: string; openingBalance: number; statementBalance: number };
type BankTransaction = { id: string; accountId: string; date: string; description: string; amount: number; direction: "in" | "out"; matchedSource: string; status: "unmatched" | "matched" | "ignored" };
type Recurring = { id: string; customer: string; description: string; amount: number; frequency: "weekly" | "fortnightly" | "monthly" | "quarterly" | "yearly"; nextDate: string; active: boolean; generated: number };
type Instalment = { id: string; customer: string; reference: string; total: number; deposit: number; paid: number; instalments: number; dueDate: string; status: "active" | "paid" };
type Reminder = { id: string; invoiceNumber: string; customer: string; due: string; balance: number; status: "due" | "sent" | "resolved"; lastActionAt: string };
type Store = { accounts: BankAccount[]; transactions: BankTransaction[]; recurring: Recurring[]; instalments: Instalment[]; reminders: Reminder[] };
type JournalLine = { account: string; side: "debit" | "credit"; amount: number };
type Journal = { id: string; date: string; memo: string; lines: JournalLine[]; source: string };
type AccountingDoc = { id: string; number: string; kind: "quote" | "invoice" | "credit"; customer: string; date: string; due: string; status: "draft" | "sent" | "accepted" | "part-paid" | "paid" | "void"; items: Array<{ description: string; qty: number; rate: number; gst: "gst" | "free" | "input" }>; payments: number; notes: string };
type AccountingStore = { journals?: Journal[]; docs?: AccountingDoc[]; bills?: unknown[]; refunds?: unknown[]; nextQuote?: number; nextInvoice?: number; nextCredit?: number; lockDate?: string };

const empty: Store = { accounts: [{ id: "bank-main", name: "Main business account", openingBalance: 0, statementBalance: 0 }], transactions: [], recurring: [], instalments: [], reminders: [] };
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
  const result = appendJournal(readBooksStore(), journal as LedgerJournal);
  if (!result.added) return false;
  saveBooksStore(result.store);
  return true;
}

export function CommercialFinanceControls({ initialTab = "banking" }: { initialTab?: "banking" | "recurring" | "instalments" | "statements" }) {
  const [store, setStore] = useState<Store>(empty);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"banking" | "recurring" | "instalments" | "statements">(initialTab);
  const [bankTx, setBankTx] = useState({ accountId: "bank-main", date: "", description: "", amount: 0, direction: "in" as BankTransaction["direction"] });
  const [recurring, setRecurring] = useState({ customer: "", description: "", amount: 0, frequency: "monthly" as Recurring["frequency"], nextDate: "" });
  const [plan, setPlan] = useState({ customer: "", reference: "", total: 0, deposit: 0, instalments: 4, dueDate: "" });
  const [accountForm, setAccountForm] = useState({ name: "", openingBalance: 0, statementBalance: 0 });
  const [postingAccount, setPostingAccount] = useState<Record<string, string>>({});
  const [postingGst, setPostingGst] = useState<Record<string, boolean>>({});
  const [bankConnectOpen, setBankConnectOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState("");
  const [connectionNotice, setConnectionNotice] = useState("");
  const institutions = ["Commonwealth Bank", "Westpac", "NAB", "ANZ", "Macquarie Bank", "Bank of Queensland", "Bendigo Bank", "Suncorp Bank", "ING", "Other Australian bank"];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Store>;
        setStore({
          ...empty,
          ...parsed,
          accounts: Array.isArray(parsed.accounts) && parsed.accounts.length ? parsed.accounts : empty.accounts,
          transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
          recurring: Array.isArray(parsed.recurring) ? parsed.recurring : [],
          instalments: Array.isArray(parsed.instalments) ? parsed.instalments : [],
          reminders: Array.isArray(parsed.reminders) ? parsed.reminders : [],
        });
      }
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

  const balances = useMemo(() => {
    const accounting = readAccounting();
    const journals = accounting.journals || [];
    return store.accounts.map((account) => {
      const names = account.id === "bank-main" ? new Set([account.name, "Bank"]) : new Set([account.name]);
      const ledgerMovement = journals.reduce((sum, journal) => sum + journal.lines.filter((line) => names.has(line.account)).reduce((lineSum, line) => lineSum + (line.side === "debit" ? line.amount : -line.amount), 0), 0);
      const bookBalance = round(account.openingBalance + ledgerMovement);
      return { ...account, bookBalance, difference: round(account.statementBalance - bookBalance) };
    });
  }, [store, tab]);

  const ledgerNameForAccount = (accountId: string) => {
    const account = store.accounts.find((item) => item.id === accountId);
    if (!account) return "Bank";
    return account.id === "bank-main" ? "Bank" : account.name;
  };

  const addBankAccount = (event: FormEvent) => {
    event.preventDefault();
    if (!accountForm.name.trim()) return;
    const account: BankAccount = { id: id("bank"), name: accountForm.name.trim(), openingBalance: accountForm.openingBalance, statementBalance: accountForm.statementBalance };
    setStore((current) => ({ ...current, accounts: [account, ...current.accounts] }));
    try {
      const raw = localStorage.getItem(BOOKS_SETTINGS_KEY);
      const settings = raw ? JSON.parse(raw) as { customAccounts?: Array<Record<string, unknown>> } : {};
      const customAccounts = Array.isArray(settings.customAccounts) ? settings.customAccounts : [];
      const bankAccount = { code: "10" + String(customAccounts.length + 30).padStart(2, "0"), name: account.name, type: "asset", cashflow: "transfer", active: true };
      localStorage.setItem(BOOKS_SETTINGS_KEY, JSON.stringify({ ...settings, customAccounts: [bankAccount, ...customAccounts.filter((item) => item.name !== account.name)] }));
      window.dispatchEvent(new CustomEvent("business-lifeline-ledger-sync", { detail: { changed: true } }));
    } catch {}
    setBankTx((current) => ({ ...current, accountId: account.id }));
    setAccountForm({ name: "", openingBalance: 0, statementBalance: 0 });
  };

  const parseStatementCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = text.split(/\r?\n/).filter(Boolean);
    if (rows.length < 2) return;
    const headers = rows[0].split(",").map((value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ""));
    const field = (...names: string[]) => names.map((name) => headers.indexOf(name)).find((index) => typeof index === "number" && index >= 0) ?? -1;
    const dateIndex = field("date", "transactiondate", "valuedate");
    const descIndex = field("description", "narrative", "details", "transaction", "memo");
    const amountIndex = field("amount", "value");
    const debitIndex = field("debit", "withdrawal", "moneyout");
    const creditIndex = field("credit", "deposit", "moneyin");
    const directionIndex = field("direction", "type");
    const accountId = bankTx.accountId || store.accounts[0]?.id || "bank-main";
    const imported: BankTransaction[] = [];
    for (const line of rows.slice(1)) {
      const cols = line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
      const description = descIndex >= 0 ? cols[descIndex] : cols[1] || "Imported bank transaction";
      const rawDebit = debitIndex >= 0 ? Number((cols[debitIndex] || "").replace(/[$,]/g, "")) : 0;
      const rawCredit = creditIndex >= 0 ? Number((cols[creditIndex] || "").replace(/[$,]/g, "")) : 0;
      let amount = amountIndex >= 0 ? Number((cols[amountIndex] || "").replace(/[$,]/g, "")) : rawCredit || rawDebit;
      let direction: BankTransaction["direction"] = rawDebit > 0 ? "out" : "in";
      if (amount < 0) { direction = "out"; amount = Math.abs(amount); }
      if (directionIndex >= 0 && /debit|out|withdraw/i.test(cols[directionIndex] || "")) direction = "out";
      if (directionIndex >= 0 && /credit|in|deposit/i.test(cols[directionIndex] || "")) direction = "in";
      if (!Number.isFinite(amount) || amount <= 0) continue;
      imported.push({ id: id("bankcsv"), accountId, date: dateIndex >= 0 ? (cols[dateIndex] || today()) : today(), description, amount: round(amount), direction, matchedSource: "", status: "unmatched" });
    }
    setStore((current) => ({ ...current, transactions: [...imported, ...current.transactions] }));
    event.target.value = "";
  };

  const autoMatch = () => {
    setStore((current) => {
      const alreadyUsed = new Set(current.transactions.filter((tx) => tx.matchedSource).map((tx) => tx.matchedSource));
      const transactions = current.transactions.map((tx) => {
        if (tx.status !== "unmatched") return tx;
        const matches = journalSources.filter((journal) => !alreadyUsed.has(journal.source) && Math.abs(journal.amount - tx.amount) < 0.01);
        if (matches.length !== 1) return tx;
        alreadyUsed.add(matches[0].source);
        return { ...tx, matchedSource: matches[0].source, status: "matched" as const };
      });
      return { ...current, transactions };
    });
  };

  const postUnmatched = (transaction: BankTransaction) => {
    const account = postingAccount[transaction.id] || (transaction.direction === "in" ? "Sales Revenue" : "Operating Expense");
    const source = "BANK:POST:" + transaction.id;
    const bankAccount = ledgerNameForAccount(transaction.accountId);
    const hasGst = Boolean(postingGst[transaction.id]);
    const gst = hasGst ? round(transaction.amount / 11) : 0;
    const net = round(transaction.amount - gst);
    const lines: JournalLine[] = transaction.direction === "in"
      ? [{ account: bankAccount, side: "debit", amount: transaction.amount }, { account, side: "credit", amount: net }, ...(gst > 0 ? [{ account: "GST Payable", side: "credit" as const, amount: gst }] : [])]
      : [{ account, side: "debit", amount: net }, ...(gst > 0 ? [{ account: "GST Input Credit", side: "debit" as const, amount: gst }] : []), { account: bankAccount, side: "credit", amount: transaction.amount }];
    if (writeJournal({ id: id("journal"), date: transaction.date, memo: transaction.description, source, lines })) matchTransaction(transaction, source);
  };

  const addBankTransaction = (event: FormEvent) => {
    event.preventDefault();
    if (!bankTx.description.trim() || bankTx.amount <= 0) return;
    setStore((current) => ({ ...current, transactions: [{ id: id("banktx"), ...bankTx, date: bankTx.date || today(), matchedSource: "", status: "unmatched" as const }, ...current.transactions] }));
    setBankTx({ accountId: bankTx.accountId, date: "", description: "", amount: 0, direction: "in" });
  };

  const matchTransaction = (transaction: BankTransaction, source: string) => {
    setStore((current) => ({ ...current, transactions: current.transactions.map((item) => item.id === transaction.id ? { ...item, matchedSource: source, status: "matched" as const } : item) }));
  };

  const settleCardClearing = (transaction: BankTransaction) => {
    const source = `BANK:CARD-SETTLEMENT:${transaction.id}`;
    const posted = writeJournal({ id: id("journal"), date: transaction.date, memo: `Card settlement ${transaction.description}`, source, lines: [
      { account: ledgerNameForAccount(transaction.accountId), side: "debit", amount: transaction.amount },
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
    const accounting = readAccounting();
    const docs = Array.isArray(accounting.docs) ? accounting.docs : [];
    const invoiceNumber = "INV-" + String(accounting.nextInvoice || 1).padStart(5, "0");
    const invoice: AccountingDoc = {
      id: id("doc"),
      number: invoiceNumber,
      kind: "invoice",
      customer: rule.customer,
      date: rule.nextDate,
      due: rule.nextDate,
      status: "sent",
      items: [{ description: rule.description || "Recurring service", qty: 1, rate: rule.amount, gst: "gst" }],
      payments: 0,
      notes: "Generated by Lifeline Pay recurring billing",
    };
    localStorage.setItem(ACCOUNTING_KEY, JSON.stringify({ ...accounting, docs: [invoice, ...docs], nextInvoice: (accounting.nextInvoice || 1) + 1 }));
    window.dispatchEvent(new CustomEvent("business-lifeline-ledger-sync", { detail: { changed: true } }));
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
    setStore((current) => ({ ...current, instalments: [{ id: id("plan"), ...plan, paid: plan.deposit, status: (plan.deposit >= plan.total ? "paid" : "active") as Instalment["status"] }, ...current.instalments] }));
    if (plan.deposit > 0) writeJournal({ id: id("journal"), date: today(), memo: `Deposit · ${plan.customer} · ${plan.reference}`, source: `DEPOSIT:${plan.customer}:${Date.now()}`, lines: [
      { account: ledgerNameForAccount(store.accounts[0]?.id || "bank-main"), side: "debit", amount: plan.deposit },
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
      { account: ledgerNameForAccount(store.accounts[0]?.id || "bank-main"), side: "debit", amount: actual },
      { account: "Accounts Receivable", side: "credit", amount: actual },
    ] })) return;
    setStore((current) => ({ ...current, instalments: current.instalments.map((planItem) => planItem.id === item.id ? { ...planItem, paid: round(planItem.paid + actual), status: (planItem.paid + actual >= planItem.total ? "paid" : "active") as Instalment["status"] } : planItem) }));
  };

  const refreshReminders = () => {
    const accounting = readAccounting();
    const docs = Array.isArray(accounting.docs) ? accounting.docs : [];
    const now = today();
    const reminders: Reminder[] = docs.flatMap((doc) => {
      if (doc.kind !== "invoice" || doc.status === "paid" || doc.status === "void" || doc.status === "draft") return [];
      const items = Array.isArray(doc.items) ? doc.items : [];
      const total = items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0), 0);
      const balance = round(Math.max(0, total - Number(doc.payments || 0)));
      const due = String(doc.due || doc.date || "");
      if (balance <= 0 || !due || due >= now) return [];
      const existing = store.reminders.find((item) => item.invoiceNumber === String(doc.number || doc.id || ""));
      return [{
        id: existing?.id || id("reminder"),
        invoiceNumber: String(doc.number || doc.id || "Invoice"),
        customer: String(doc.customer || "Customer"),
        due,
        balance,
        status: existing?.status === "sent" ? "sent" as const : "due" as const,
        lastActionAt: existing?.lastActionAt || "",
      }];
    });
    setStore((current) => ({ ...current, reminders }));
  };

  const reminderText = (item: Reminder) =>
    `Hi ${item.customer}, this is a friendly reminder that ${item.invoiceNumber} for ${money(item.balance)} was due on ${item.due}. Please let us know if payment has already been made or if you need to discuss the account. Thank you.`;

  const copyReminder = async (item: Reminder) => {
    await navigator.clipboard?.writeText(reminderText(item));
    setStore((current) => ({ ...current, reminders: current.reminders.map((reminder) => reminder.id === item.id ? { ...reminder, status: "sent" as const, lastActionAt: new Date().toISOString() } : reminder) }));
  };

  const customerStatement = (customer: string) => {
    const plans = store.instalments.filter((item) => item.customer === customer);
    const recurringRules = store.recurring.filter((item) => item.customer === customer);
    const accounting = readAccounting();
    const docs = Array.isArray(accounting.docs) ? accounting.docs : [];
    const invoices = docs.filter((doc) => doc.kind === "invoice" && String(doc.customer || "") === customer && doc.status !== "void");
    const invoiceRows = invoices.map((doc) => {
      const items = Array.isArray(doc.items) ? doc.items : [];
      const total = round(items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0), 0));
      const paid = round(Number(doc.payments || 0));
      return { reference: String(doc.number || doc.id || "Invoice"), date: String(doc.date || ""), due: String(doc.due || ""), total, paid, balance: round(Math.max(0, total - paid)), status: String(doc.status || "") };
    });
    const planTotal = plans.reduce((sum, item) => sum + item.total - item.paid, 0);
    const invoiceTotal = invoiceRows.reduce((sum, item) => sum + item.balance, 0);
    const win = window.open("", "_blank", "width=850,height=900");
    if (!win) return;
    win.document.write(`<html><head><title>Statement - ${customer}</title><style>body{font-family:Arial;padding:48px;color:#173244}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #ccd8de;text-align:left}.right{text-align:right}</style></head><body><h1>Lifeline Pay · Customer statement</h1><h2>${customer}</h2><p>Date ${new Date().toLocaleDateString("en-AU")}</p><table><tr><th>Reference</th><th>Date</th><th>Due</th><th>Total</th><th>Paid</th><th>Balance</th></tr>${invoiceRows.map((item) => `<tr><td>${item.reference}</td><td>${item.date}</td><td>${item.due}</td><td>${money(item.total)}</td><td>${money(item.paid)}</td><td>${money(item.balance)}</td></tr>`).join("")}${plans.map((item) => `<tr><td>${item.reference}</td><td></td><td>${item.dueDate}</td><td>${money(item.total)}</td><td>${money(item.paid)}</td><td>${money(item.total-item.paid)}</td></tr>`).join("")}</table><h3 class="right">Total owing ${money(invoiceTotal+planTotal)}</h3><p>Recurring arrangements: ${recurringRules.length}</p><script>window.print()</script></body></html>`);
    win.document.close();
  };

  const accountingCustomers = (() => { const accounting = readAccounting(); const docs = Array.isArray(accounting.docs) ? accounting.docs : []; return docs.filter((doc) => doc.kind === "invoice").map((doc) => doc.customer).filter(Boolean); })();
  const customers = [...new Set([...store.instalments.map((item) => item.customer), ...store.recurring.map((item) => item.customer), ...accountingCustomers])];

  return <section className="commercial-finance-controls">
    <header><small>LIFELINE BANK + LIFELINE PAY</small><h2>Bank reconciliation, customer payments and recurring cash flow</h2><p>Import statements, reconcile to Lifeline Books, post unmatched transactions, create recurring billing and manage instalment plans without another accounting app.</p></header>
    <nav>{([["banking", "Lifeline Bank"], ["recurring", "Lifeline Pay · Recurring"], ["instalments", "Lifeline Pay · Instalments"], ["statements", "Lifeline Pay · Statements"]] as const).map(([key, label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}</nav>

    {tab === "banking" && <main>
      <div className="cfc-kpis">{balances.map((account) => <article key={account.id}><small>{account.name}</small><strong>{money(account.bookBalance)}</strong><span>Statement {money(account.statementBalance)}</span><b className={account.difference === 0 ? "ok" : "warn"}>Difference {money(account.difference)}</b><input type="number" step="0.01" value={account.statementBalance || ""} placeholder="Statement balance" onChange={(event) => setStore((current) => ({ ...current, accounts: current.accounts.map((item) => item.id === account.id ? { ...item, statementBalance: Number(event.target.value) } : item) }))}/></article>)}</div>
      <div className="bank-ingest-choice">
        <article><small>LIVE BANK FEED · BETA SETUP</small><h3>Connect your bank</h3><p>Choose your Australian bank and prepare a secure Open Banking/CDR connection. Business Lifeline never asks for or stores your internet-banking password.</p><button type="button" onClick={() => { setBankConnectOpen(true); setConnectionNotice(""); }}>Connect a bank</button></article>
        <article><small>AVAILABLE NOW</small><h3>Upload a bank statement</h3><p>Import a CSV statement now and reconcile transactions immediately. This remains available even after live bank feeds are enabled.</p><label className="bank-statement-button">Choose CSV statement<input type="file" accept=".csv,text/csv" onChange={parseStatementCsv}/></label></article>
      </div>
      {bankConnectOpen && <div className="bank-connect-panel"><div className="section-heading"><div><p className="eyebrow">SECURE BANK CONNECTION</p><h3>Choose your bank</h3></div><button type="button" onClick={() => setBankConnectOpen(false)}>Close</button></div><p>Select the institution that holds the business account. Live CDR authorisation will redirect through an accredited provider when that provider is configured; credentials will never be entered into Business Lifeline.</p><div className="bank-provider-grid">{institutions.map((institution) => <button type="button" key={institution} className={selectedInstitution === institution ? "active" : ""} onClick={() => { setSelectedInstitution(institution); setConnectionNotice(""); }}><strong>{institution}</strong><span>{selectedInstitution === institution ? "Selected ✓" : "Select bank"}</span></button>)}</div><button type="button" className="button primary" disabled={!selectedInstitution} onClick={() => setConnectionNotice(`${selectedInstitution} selected. Live Open Banking authorisation is not enabled in this beta yet. Use statement upload below until the accredited CDR provider is connected.`)}>Continue securely</button>{connectionNotice && <p className="bank-connection-notice" role="status">{connectionNotice}</p>}</div>}
      <div className="lifeline-report-grid">
        <form onSubmit={addBankAccount} className="cfc-form"><h3>Add manual bank account</h3><input placeholder="Account name" value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })}/><input type="number" step="0.01" placeholder="Opening balance" value={accountForm.openingBalance || ""} onChange={(event) => setAccountForm({ ...accountForm, openingBalance: Number(event.target.value) || 0 })}/><input type="number" step="0.01" placeholder="Statement balance" value={accountForm.statementBalance || ""} onChange={(event) => setAccountForm({ ...accountForm, statementBalance: Number(event.target.value) || 0 })}/><button>Add account</button></form>
        <section className="cfc-form"><h3>Statement import & reconciliation</h3><p>Choose which Lifeline Bank account receives imported transactions, then auto-match them against Lifeline Books.</p><select value={bankTx.accountId} onChange={(event) => setBankTx({ ...bankTx, accountId: event.target.value })}>{store.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select><input type="file" accept=".csv,text/csv" onChange={parseStatementCsv}/><button type="button" onClick={autoMatch}>Auto-match exact amounts</button></section>
      </div>
      <form onSubmit={addBankTransaction} className="cfc-form"><h3>Add/import bank line</h3><select value={bankTx.accountId} onChange={(event) => setBankTx({ ...bankTx, accountId: event.target.value })}>{store.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select><input type="date" value={bankTx.date} onChange={(event) => setBankTx({ ...bankTx, date: event.target.value })}/><input placeholder="Statement description" value={bankTx.description} onChange={(event) => setBankTx({ ...bankTx, description: event.target.value })}/><input type="number" step="0.01" placeholder="Amount" value={bankTx.amount || ""} onChange={(event) => setBankTx({ ...bankTx, amount: Number(event.target.value) })}/><select value={bankTx.direction} onChange={(event) => setBankTx({ ...bankTx, direction: event.target.value as BankTransaction["direction"] })}><option value="in">Money in</option><option value="out">Money out</option></select><button>Add statement line</button></form>
      <div className="cfc-list">{store.transactions.map((transaction) => <article key={transaction.id}><div><strong>{transaction.date} · {transaction.description}</strong><span>{transaction.direction === "in" ? "+" : "-"}{money(transaction.amount)} · {transaction.status}</span>{transaction.matchedSource && <small>{transaction.matchedSource}</small>}</div><div>{transaction.status === "unmatched" && transaction.direction === "in" && <button onClick={() => settleCardClearing(transaction)}>Settle card clearing</button>}{transaction.status === "unmatched" && <select defaultValue="" onChange={(event) => event.target.value && matchTransaction(transaction, event.target.value)}><option value="">Match ledger source…</option>{journalSources.filter((journal) => Math.abs(journal.amount - transaction.amount) < 0.01).map((journal) => <option key={journal.source} value={journal.source}>{journal.date} · {journal.memo}</option>)}</select>}{transaction.status === "unmatched" && <><select value={postingAccount[transaction.id] || (transaction.direction === "in" ? "Sales Revenue" : "Operating Expense")} onChange={(event) => setPostingAccount((current) => ({ ...current, [transaction.id]: event.target.value }))}>{(transaction.direction === "in" ? ["Sales Revenue","Service Revenue","Owner Equity","Business Loan"] : ["Operating Expense","Rent","Utilities","Advertising & Marketing","Insurance","Motor Vehicle","Repairs & Maintenance","Professional Fees","Bank & Merchant Fees","Business Loan"]).map((account) => <option key={account}>{account}</option>)}</select><label><input type="checkbox" checked={Boolean(postingGst[transaction.id])} onChange={(event) => setPostingGst((current) => ({ ...current, [transaction.id]: event.target.checked }))} /> GST included</label><button onClick={() => postUnmatched(transaction)}>Post to Books</button></>}<button onClick={() => setStore((current) => ({ ...current, transactions: current.transactions.map((item) => item.id === transaction.id ? { ...item, status: "ignored" as const } : item) }))}>Ignore</button></div></article>)}</div>
    </main>}

    {tab === "recurring" && <main><form onSubmit={addRecurring} className="cfc-form"><h3>Create recurring billing rule</h3><input placeholder="Customer" value={recurring.customer} onChange={(event) => setRecurring({ ...recurring, customer: event.target.value })}/><input placeholder="Description" value={recurring.description} onChange={(event) => setRecurring({ ...recurring, description: event.target.value })}/><input type="number" step="0.01" placeholder="Amount" value={recurring.amount || ""} onChange={(event) => setRecurring({ ...recurring, amount: Number(event.target.value) })}/><select value={recurring.frequency} onChange={(event) => setRecurring({ ...recurring, frequency: event.target.value as Recurring["frequency"] })}><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select><input type="date" value={recurring.nextDate} onChange={(event) => setRecurring({ ...recurring, nextDate: event.target.value })}/><button>Add recurring rule</button></form><div className="cfc-list">{store.recurring.map((rule) => <article key={rule.id}><div><strong>{rule.customer} · {rule.description}</strong><span>{money(rule.amount)} · {rule.frequency} · next {rule.nextDate}</span><small>{rule.generated} invoice journal{rule.generated === 1 ? "" : "s"} generated</small></div><div><button onClick={() => generateRecurring(rule)}>Generate now</button><button onClick={() => setStore((current) => ({ ...current, recurring: current.recurring.map((item) => item.id === rule.id ? { ...item, active: !item.active } : item) }))}>{rule.active ? "Pause" : "Resume"}</button></div></article>)}</div></main>}

    {tab === "instalments" && <main><form onSubmit={addPlan} className="cfc-form"><h3>Create deposit or instalment plan</h3><input placeholder="Customer" value={plan.customer} onChange={(event) => setPlan({ ...plan, customer: event.target.value })}/><input placeholder="Invoice/reference" value={plan.reference} onChange={(event) => setPlan({ ...plan, reference: event.target.value })}/><input type="number" step="0.01" placeholder="Contract total" value={plan.total || ""} onChange={(event) => setPlan({ ...plan, total: Number(event.target.value) })}/><input type="number" step="0.01" placeholder="Deposit received" value={plan.deposit || ""} onChange={(event) => setPlan({ ...plan, deposit: Number(event.target.value) })}/><input type="number" min="1" placeholder="Instalment count" value={plan.instalments} onChange={(event) => setPlan({ ...plan, instalments: Number(event.target.value) })}/><input type="date" value={plan.dueDate} onChange={(event) => setPlan({ ...plan, dueDate: event.target.value })}/><button>Create payment plan</button></form><div className="cfc-list">{store.instalments.map((item) => <article key={item.id}><div><strong>{item.customer} · {item.reference}</strong><span>Total {money(item.total)} · paid {money(item.paid)} · owing {money(item.total-item.paid)}</span><small>{item.instalments} instalments · due {item.dueDate || "not set"} · {item.status}</small></div>{item.status !== "paid" && <button onClick={() => recordInstalment(item)}>Record instalment</button>}</article>)}</div></main>}

    {tab === "statements" && <main>
      <div className="section-heading"><div><p className="eyebrow">COLLECTIONS</p><h3>Statements and overdue reminders</h3></div><button type="button" className="button ghost" onClick={refreshReminders}>Refresh overdue invoices</button></div>
      <div className="cfc-list">{store.reminders.map((item) => <article key={item.id}><div><strong>{item.customer} · {item.invoiceNumber}</strong><span>{money(item.balance)} · due {item.due} · {item.status}</span>{item.lastActionAt && <small>Last action {new Date(item.lastActionAt).toLocaleString("en-AU")}</small>}</div><div><button type="button" onClick={() => copyReminder(item)}>Copy reminder</button><button type="button" onClick={() => setStore((current) => ({ ...current, reminders: current.reminders.map((reminder) => reminder.id === item.id ? { ...reminder, status: "resolved" as const } : reminder) }))}>Resolve</button></div></article>)}</div>
      <h3>Customer statements</h3><div className="cfc-list">{customers.map((customer) => { const plans = store.instalments.filter((item) => item.customer === customer); const invoiceReminders = store.reminders.filter((item) => item.customer === customer && item.status !== "resolved"); const owing = plans.reduce((sum, item) => sum + item.total - item.paid, 0) + invoiceReminders.reduce((sum, item) => sum + item.balance, 0); return <article key={customer}><div><strong>{customer}</strong><span>{plans.length} payment plan{plans.length === 1 ? "" : "s"} · visible overdue/plan balance {money(owing)}</span><small>{store.recurring.filter((item) => item.customer === customer).length} recurring rule{store.recurring.filter((item) => item.customer === customer).length === 1 ? "" : "s"}</small></div><button onClick={() => customerStatement(customer)}>Print/PDF statement</button></article> })}</div>
    </main>}
  </section>;
}
