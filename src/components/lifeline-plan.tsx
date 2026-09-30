"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { profitAndLoss, readBooksStore, readChart } from "@/lib/lifeline-books-engine";

export const LIFELINE_PLAN_KEY = "business-lifeline-plan-v1";

type BudgetLine = {
  id: string;
  account: string;
  monthly: number[];
};

type PlanStore = {
  financialYearStart: string;
  lines: BudgetLine[];
};

const monthNames = ["Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun"];
const empty: PlanStore = { financialYearStart: "", lines: [] };
const money = (value: number) => value.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const round = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const id = () => "budget-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);

function defaultYearStart() {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return year + "-07-01";
}
function readPlan(): PlanStore {
  try {
    const raw = localStorage.getItem(LIFELINE_PLAN_KEY);
    if (!raw) return { ...empty, financialYearStart: defaultYearStart() };
    const parsed = JSON.parse(raw) as Partial<PlanStore>;
    return {
      financialYearStart: parsed.financialYearStart || defaultYearStart(),
      lines: Array.isArray(parsed.lines) ? parsed.lines.map((line) => ({ ...line, monthly: Array.isArray(line.monthly) ? [...line.monthly, ...Array(12).fill(0)].slice(0, 12) : Array(12).fill(0) })) : [],
    };
  } catch { return { ...empty, financialYearStart: defaultYearStart() }; }
}
function addMonths(date: string, count: number) {
  const value = new Date(date + "T00:00:00Z");
  value.setUTCMonth(value.getUTCMonth() + count);
  return value.toISOString().slice(0, 10);
}
function monthEnd(start: string, offset: number) {
  const next = new Date(addMonths(start, offset + 1) + "T00:00:00Z");
  next.setUTCDate(0);
  return next.toISOString().slice(0, 10);
}

export function LifelinePlan() {
  const [store, setStore] = useState<PlanStore>(() => ({ ...empty, financialYearStart: defaultYearStart() }));
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState({ account: "", monthly: 0 });
  const [revision, setRevision] = useState(0);

  useEffect(() => { setStore(readPlan()); setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem(LIFELINE_PLAN_KEY, JSON.stringify(store)); }, [store, ready]);
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("business-lifeline-ledger-sync", refresh);
    return () => window.removeEventListener("business-lifeline-ledger-sync", refresh);
  }, []);

  const chart = useMemo(() => readChart(), [revision]);
  const budgetAccounts = chart.filter((account) => ["income","cogs","expense"].includes(account.type));
  const monthPeriods = useMemo(() => Array.from({ length: 12 }, (_, index) => ({ start: addMonths(store.financialYearStart || defaultYearStart(), index), end: monthEnd(store.financialYearStart || defaultYearStart(), index) })), [store.financialYearStart]);

  const actualByMonth = useMemo(() => monthPeriods.map((period) => profitAndLoss(readBooksStore(), chart, period.start, period.end)), [monthPeriods, chart, revision]);

  const actualForAccount = (account: string, monthIndex: number) => {
    const report = actualByMonth[monthIndex];
    const all = [...report.income, ...report.costOfSales, ...report.expenses];
    return all.find((row) => row.account === account)?.amount ?? 0;
  };

  const addLine = (event: FormEvent) => {
    event.preventDefault();
    if (!form.account) return;
    const existing = store.lines.find((line) => line.account === form.account);
    if (existing) {
      setStore((current) => ({ ...current, lines: current.lines.map((line) => line.id === existing.id ? { ...line, monthly: Array(12).fill(round(form.monthly)) } : line) }));
    } else {
      setStore((current) => ({ ...current, lines: [...current.lines, { id: id(), account: form.account, monthly: Array(12).fill(round(form.monthly)) }] }));
    }
    setForm({ account: "", monthly: 0 });
  };

  const updateMonth = (lineId: string, index: number, value: number) =>
    setStore((current) => ({ ...current, lines: current.lines.map((line) => line.id === lineId ? { ...line, monthly: line.monthly.map((item, itemIndex) => itemIndex === index ? round(value) : item) } : line) }));

  const totals = useMemo(() => {
    const budget = store.lines.reduce((sum, line) => sum + line.monthly.reduce((lineSum, value) => lineSum + value, 0), 0);
    const incomeBudget = store.lines.filter((line) => chart.find((account) => account.name === line.account)?.type === "income").reduce((sum, line) => sum + line.monthly.reduce((lineSum, value) => lineSum + value, 0), 0);
    const costBudget = store.lines.filter((line) => ["cogs","expense"].includes(chart.find((account) => account.name === line.account)?.type || "")).reduce((sum, line) => sum + line.monthly.reduce((lineSum, value) => lineSum + value, 0), 0);
    const actualIncome = actualByMonth.reduce((sum, report) => sum + report.totalIncome, 0);
    const actualCosts = actualByMonth.reduce((sum, report) => sum + report.totalCostOfSales + report.totalExpenses, 0);
    return { budget, incomeBudget, costBudget, budgetProfit: incomeBudget - costBudget, actualIncome, actualCosts, actualProfit: actualIncome - actualCosts };
  }, [store.lines, chart, actualByMonth]);

  return <section className="lifeline-product">
    <header className="lifeline-product-hero"><div><p className="eyebrow">LIFELINE PLAN</p><h2>Budget against the books, not against hope.</h2><p>Set account-level targets for the year and compare every month against actual Lifeline Books results.</p></div><div className="lifeline-integrity good"><strong>{money(totals.budgetProfit)}</strong><span>Budgeted annual result</span></div></header>

    <section className="metric-grid">
      <article><span>Budget revenue</span><strong>{money(totals.incomeBudget)}</strong></article>
      <article><span>Actual revenue</span><strong>{money(totals.actualIncome)}</strong></article>
      <article><span>Budget profit</span><strong>{money(totals.budgetProfit)}</strong></article>
      <article><span>Actual result</span><strong className={totals.actualProfit >= 0 ? "positive" : "negative"}>{money(totals.actualProfit)}</strong></article>
    </section>

    <section className="panel">
      <div className="section-heading"><span>FINANCIAL YEAR</span><h3>Budget period</h3></div>
      <label className="field"><span>Financial year start</span><input type="date" value={store.financialYearStart || defaultYearStart()} onChange={(e) => setStore({ ...store, financialYearStart: e.target.value })} /></label>
    </section>

    <div className="lifeline-report-grid">
      <form className="panel fields" onSubmit={addLine}><p className="eyebrow">BUDGET LINE</p><h3>Add account target</h3>
        <label className="field"><span>Account</span><select value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}><option value="">Choose account</option>{budgetAccounts.map((account) => <option key={account.code + account.name}>{account.name}</option>)}</select></label>
        <label className="field"><span>Default monthly budget</span><input type="number" step="0.01" value={form.monthly || ""} onChange={(e) => setForm({ ...form, monthly: Number(e.target.value) || 0 })} /></label>
        <button className="button primary">Add / reset line</button>
      </form>
      <section className="panel"><p className="eyebrow">VARIANCE</p><h3>Year-to-date control</h3><p>Revenue variance: <strong>{money(totals.actualIncome - totals.incomeBudget)}</strong></p><p>Cost variance: <strong>{money(totals.actualCosts - totals.costBudget)}</strong></p><p>Profit variance: <strong className={totals.actualProfit - totals.budgetProfit >= 0 ? "positive" : "negative"}>{money(totals.actualProfit - totals.budgetProfit)}</strong></p></section>
    </div>

    <section className="panel"><div className="section-heading"><span>12-MONTH BUDGET</span><h3>Budget vs actual by account</h3></div>
      <div className="lifeline-budget-table">
        <div className="lifeline-budget-head"><span>Account</span>{monthNames.map((month) => <span key={month}>{month}</span>)}<span>Annual</span></div>
        {store.lines.map((line) => <div className="lifeline-budget-row" key={line.id}><strong>{line.account}</strong>{line.monthly.map((value, index) => {
          const actual = actualForAccount(line.account, index);
          return <label key={index}><input type="number" step="0.01" value={value} onChange={(e) => updateMonth(line.id, index, Number(e.target.value) || 0)} /><small>A {money(actual)}</small></label>;
        })}<strong>{money(line.monthly.reduce((sum, value) => sum + value, 0))}</strong></div>)}
      </div>
    </section>
  </section>;
}
