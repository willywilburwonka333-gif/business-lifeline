"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdvancedAccountingHub } from "@/components/advanced-accounting-hub";
import {
  LIFELINE_BOOKS_SETTINGS_KEY,
  agedPayables,
  agedReceivables,
  agingTotals,
  balanceSheet,
  booksIntegrity,
  cashflowSummary,
  generalLedger,
  profitAndLoss,
  readBooksStore,
  readChart,
  trialBalance,
  type AccountType,
  type CashflowClass,
  type LifelineAccount,
} from "@/lib/lifeline-books-engine";

type View = "overview" | "transactions" | "reports" | "receivables" | "payables" | "ledger" | "chart";

const currencyFor = (country?: string) => {
  const value = (country || "Australia").toLowerCase();
  if (value.includes("new zealand")) return "NZD";
  if (value.includes("united kingdom")) return "GBP";
  if (value.includes("canada")) return "CAD";
  if (value.includes("united states") || value.includes("usa")) return "USD";
  return "AUD";
};
const money = (value: number, country?: string) => value.toLocaleString("en", { style: "currency", currency: currencyFor(country), maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);

function firstDayOfFinancialYear(date = new Date()) {
  const year = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  return String(year) + "-07-01";
}

export function LifelineBooks({ country }: { country?: string }) {
  const [view, setView] = useState<View>("overview");
  const [revision, setRevision] = useState(0);
  const [period, setPeriod] = useState({ start: firstDayOfFinancialYear(), end: today() });
  const [ledgerAccount, setLedgerAccount] = useState("");
  const [accountForm, setAccountForm] = useState({ code: "", name: "", type: "expense" as AccountType, cashflow: "operating" as CashflowClass });

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("business-lifeline-ledger-sync", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("business-lifeline-ledger-sync", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const store = useMemo(() => readBooksStore(), [revision]);
  const chart = useMemo(() => readChart(), [revision]);
  const pnl = useMemo(() => profitAndLoss(store, chart, period.start, period.end), [store, chart, period]);
  const balance = useMemo(() => balanceSheet(store, chart, period.end), [store, chart, period.end]);
  const cashflow = useMemo(() => cashflowSummary(store, chart, period.start, period.end), [store, chart, period]);
  const trial = useMemo(() => trialBalance(store, chart, undefined, period.end), [store, chart, period.end]);
  const receivables = useMemo(() => agedReceivables(store, period.end), [store, period.end]);
  const payables = useMemo(() => agedPayables(store, period.end), [store, period.end]);
  const receivableTotals = useMemo(() => agingTotals(receivables), [receivables]);
  const payableTotals = useMemo(() => agingTotals(payables), [payables]);
  const integrity = useMemo(() => booksIntegrity(store), [store]);
  const ledger = useMemo(() => generalLedger(store, ledgerAccount || undefined, period.start, period.end), [store, ledgerAccount, period]);

  const saveCustomAccount = (event: FormEvent) => {
    event.preventDefault();
    if (!accountForm.code.trim() || !accountForm.name.trim()) return;
    const account: LifelineAccount = {
      code: accountForm.code.trim(),
      name: accountForm.name.trim(),
      type: accountForm.type,
      cashflow: accountForm.cashflow,
      active: true,
    };
    let customAccounts: LifelineAccount[] = [];
    try {
      const raw = localStorage.getItem(LIFELINE_BOOKS_SETTINGS_KEY);
      if (raw) customAccounts = (JSON.parse(raw) as { customAccounts?: LifelineAccount[] }).customAccounts ?? [];
    } catch {}
    customAccounts = [account, ...customAccounts.filter((item) => item.name.toLowerCase() !== account.name.toLowerCase())];
    localStorage.setItem(LIFELINE_BOOKS_SETTINGS_KEY, JSON.stringify({ customAccounts }));
    setAccountForm({ code: "", name: "", type: "expense", cashflow: "operating" });
    setRevision((value) => value + 1);
  };

  const exportLedger = () => {
    const rows = ["Date,Account,Debit,Credit,Memo,Source", ...ledger.map((row) => [
      row.date, row.account, row.debit, row.credit, row.memo, row.source,
    ].map((value) => '"' + String(value).replaceAll('"', '""') + '"').join(","))];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lifeline-books-general-ledger.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const reportRows = (rows: Array<{ account: string; code: string; amount: number }>) =>
    rows.length ? rows.map((row) => <div className="lifeline-report-row" key={row.code + row.account}><span>{row.code} · {row.account}</span><strong>{money(row.amount, country)}</strong></div>) : <p>No balances in this section.</p>;

  return <section className="lifeline-product lifeline-books">
    <header className="lifeline-product-hero">
      <div><p className="eyebrow">LIFELINE BOOKS</p><h2>Accounting that feeds the whole Business Lifeline.</h2><p>Double-entry books, invoices, bills, receivables, payables and financial statements share one ledger with Diagnose, Recover, Grow and Sell.</p></div>
      <div className={integrity.balanced ? "lifeline-integrity good" : "lifeline-integrity bad"}><strong>{integrity.balanced ? "Ledger balanced" : "Ledger needs review"}</strong><span>{integrity.journalCount} journals · {integrity.unbalanced.length} unbalanced</span></div>
    </header>

    <nav className="lifeline-product-nav">
      {([
        ["overview", "Overview"], ["transactions", "Transactions"], ["reports", "Reports"], ["receivables", "Receivables"],
        ["payables", "Payables"], ["ledger", "General ledger"], ["chart", "Chart of accounts"],
      ] as Array<[View, string]>).map(([id, label]) => <button key={id} type="button" className={view === id ? "active" : ""} onClick={() => setView(id)}>{label}</button>)}
    </nav>

    {view !== "transactions" && <section className="lifeline-period">
      <label>From<input type="date" value={period.start} onChange={(event) => setPeriod({ ...period, start: event.target.value })} /></label>
      <label>To<input type="date" value={period.end} onChange={(event) => setPeriod({ ...period, end: event.target.value })} /></label>
    </section>}

    {view === "overview" && <div className="workspace-section-stack">
      <section className="metric-grid">
        <article><span>Revenue</span><strong>{money(pnl.totalIncome, country)}</strong><small>{period.start} to {period.end}</small></article>
        <article><span>Net profit</span><strong className={pnl.netProfit >= 0 ? "positive" : "negative"}>{money(pnl.netProfit, country)}</strong><small>From posted ledger activity</small></article>
        <article><span>Accounts receivable</span><strong>{money(receivableTotals.total, country)}</strong><small>{money(receivableTotals["90+"], country)} over 90 days</small></article>
        <article><span>Accounts payable</span><strong>{money(payableTotals.total, country)}</strong><small>{money(payableTotals["90+"], country)} over 90 days</small></article>
        <article><span>Net assets</span><strong>{money(balance.netAssets, country)}</strong><small>Assets less liabilities</small></article>
        <article><span>Cash movement</span><strong className={cashflow.netMovement >= 0 ? "positive" : "negative"}>{money(cashflow.netMovement, country)}</strong><small>For selected period</small></article>
      </section>
      <section className="panel"><div className="section-heading"><span>Integrity</span><h3>Books control centre</h3></div>
        <div className="metric-grid">
          <article><span>Total debits</span><strong>{money(integrity.totalDebit, country)}</strong></article>
          <article><span>Total credits</span><strong>{money(integrity.totalCredit, country)}</strong></article>
          <article><span>Duplicate sources</span><strong>{integrity.duplicates.length}</strong></article>
          <article><span>Locked-period warnings</span><strong>{integrity.lockedViolations.length}</strong></article>
        </div>
        {!integrity.balanced && <aside className="urgent"><b>Accounting integrity warning</b><p>One or more journals are not balanced. Review the General Ledger before relying on reports.</p></aside>}
      </section>
    </div>}

    {view === "transactions" && <AdvancedAccountingHub />}

    {view === "reports" && <div className="workspace-section-stack">
      <section className="lifeline-report-grid">
        <article className="panel"><p className="eyebrow">PROFIT & LOSS</p><h3>{period.start} → {period.end}</h3>
          <h4>Income</h4>{reportRows(pnl.income)}
          <div className="lifeline-report-total"><span>Total income</span><strong>{money(pnl.totalIncome, country)}</strong></div>
          <h4>Cost of sales</h4>{reportRows(pnl.costOfSales)}
          <div className="lifeline-report-total"><span>Gross profit</span><strong>{money(pnl.grossProfit, country)}</strong></div>
          <h4>Operating expenses</h4>{reportRows(pnl.expenses)}
          <div className="lifeline-report-total grand"><span>Net profit</span><strong>{money(pnl.netProfit, country)}</strong></div>
        </article>
        <article className="panel"><p className="eyebrow">BALANCE SHEET</p><h3>As at {period.end}</h3>
          <h4>Assets</h4>{reportRows(balance.assets)}<div className="lifeline-report-total"><span>Total assets</span><strong>{money(balance.totalAssets, country)}</strong></div>
          <h4>Liabilities</h4>{reportRows(balance.liabilities)}<div className="lifeline-report-total"><span>Total liabilities</span><strong>{money(balance.totalLiabilities, country)}</strong></div>
          <h4>Equity</h4>{reportRows(balance.equity)}<div className="lifeline-report-total grand"><span>Total equity</span><strong>{money(balance.totalEquity, country)}</strong></div>
          {Math.abs(balance.equationDifference) > .01 && <small className="negative">Accounting equation difference: {money(balance.equationDifference, country)}</small>}
        </article>
      </section>
      <section className="panel"><p className="eyebrow">CASH FLOW</p><h3>Cash movement by activity</h3><div className="metric-grid">
        <article><span>Operating</span><strong>{money(cashflow.operating, country)}</strong></article>
        <article><span>Investing</span><strong>{money(cashflow.investing, country)}</strong></article>
        <article><span>Financing</span><strong>{money(cashflow.financing, country)}</strong></article>
        <article><span>Net cash movement</span><strong>{money(cashflow.netMovement, country)}</strong></article>
      </div></section>
      <section className="panel"><p className="eyebrow">TRIAL BALANCE</p><h3>All posted accounts</h3><div className="lifeline-table">
        <div className="lifeline-table-head"><span>Code / account</span><span>Debit</span><span>Credit</span><span>Balance</span></div>
        {trial.map((row) => <div key={row.code + row.account}><span>{row.code} · {row.account}</span><span>{money(row.debit, country)}</span><span>{money(row.credit, country)}</span><strong>{money(row.balance, country)}</strong></div>)}
      </div></section>
    </div>}

    {view === "receivables" && <section className="panel">
      <div className="section-heading"><span>AGED RECEIVABLES</span><h3>Who owes the business money?</h3></div>
      <div className="metric-grid">{(["Current", "1–30", "31–60", "61–90", "90+"] as const).map((bucket) => <article key={bucket}><span>{bucket}</span><strong>{money(receivableTotals[bucket], country)}</strong></article>)}</div>
      <div className="lifeline-table"><div className="lifeline-table-head"><span>Customer / invoice</span><span>Due</span><span>Age</span><span>Outstanding</span></div>
        {receivables.map((row) => <div key={row.id}><span><strong>{row.party}</strong><small>{row.reference}</small></span><span>{row.dueDate}</span><span>{row.bucket}</span><strong>{money(row.outstanding, country)}</strong></div>)}
      </div>
    </section>}

    {view === "payables" && <section className="panel">
      <div className="section-heading"><span>AGED PAYABLES</span><h3>What does the business owe suppliers?</h3></div>
      <div className="metric-grid">{(["Current", "1–30", "31–60", "61–90", "90+"] as const).map((bucket) => <article key={bucket}><span>{bucket}</span><strong>{money(payableTotals[bucket], country)}</strong></article>)}</div>
      <div className="lifeline-table"><div className="lifeline-table-head"><span>Supplier / bill</span><span>Due</span><span>Age</span><span>Outstanding</span></div>
        {payables.map((row) => <div key={row.id}><span><strong>{row.party}</strong><small>{row.reference}</small></span><span>{row.dueDate}</span><span>{row.bucket}</span><strong>{money(row.outstanding, country)}</strong></div>)}
      </div>
    </section>}

    {view === "ledger" && <section className="panel">
      <div className="section-heading"><span>GENERAL LEDGER</span><h3>Every posted line, with source traceability</h3></div>
      <div className="lifeline-toolbar"><select value={ledgerAccount} onChange={(event) => setLedgerAccount(event.target.value)}><option value="">All accounts</option>{[...new Set(trial.map((row) => row.account))].sort().map((account) => <option key={account}>{account}</option>)}</select><button className="button ghost" type="button" onClick={exportLedger}>Export CSV</button></div>
      <div className="lifeline-table"><div className="lifeline-table-head"><span>Date / memo</span><span>Debit</span><span>Credit</span><span>Source</span></div>
        {ledger.map((row) => <div key={row.journalId + row.account + row.debit + row.credit}><span><strong>{row.date} · {row.account}</strong><small>{row.memo}</small></span><span>{row.debit ? money(row.debit, country) : "—"}</span><span>{row.credit ? money(row.credit, country) : "—"}</span><small>{row.source}</small></div>)}
      </div>
    </section>}

    {view === "chart" && <div className="lifeline-report-grid">
      <section className="panel"><div className="section-heading"><span>CHART OF ACCOUNTS</span><h3>Business account structure</h3></div><div className="lifeline-table">
        <div className="lifeline-table-head"><span>Account</span><span>Type</span><span>Cash flow</span><span>Status</span></div>
        {chart.map((account) => <div key={account.code + account.name}><span><strong>{account.code}</strong><small>{account.name}</small></span><span>{account.type}</span><span>{account.cashflow}</span><span>{account.system ? "System" : "Custom"}</span></div>)}
      </div></section>
      <form className="panel fields" onSubmit={saveCustomAccount}><p className="eyebrow">CUSTOM ACCOUNT</p><h3>Add an account</h3>
        <label className="field"><span>Code</span><input value={accountForm.code} onChange={(event) => setAccountForm({ ...accountForm, code: event.target.value })} required /></label>
        <label className="field"><span>Name</span><input value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} required /></label>
        <label className="field"><span>Type</span><select value={accountForm.type} onChange={(event) => setAccountForm({ ...accountForm, type: event.target.value as AccountType })}>{["asset", "liability", "equity", "income", "cogs", "expense"].map((type) => <option key={type}>{type}</option>)}</select></label>
        <label className="field"><span>Cash-flow class</span><select value={accountForm.cashflow} onChange={(event) => setAccountForm({ ...accountForm, cashflow: event.target.value as CashflowClass })}>{["operating", "investing", "financing", "transfer"].map((type) => <option key={type}>{type}</option>)}</select></label>
        <button className="button primary">Add account</button>
      </form>
    </div>}
  </section>;
}
