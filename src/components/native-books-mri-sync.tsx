"use client";

import { useEffect, useRef } from "react";
import {
  accountFor,
  agedPayables,
  agedReceivables,
  balanceSheet,
  profitAndLoss,
  readBooksStore,
  readChart,
  trialBalance,
} from "@/lib/lifeline-books-engine";
import { mergeImportDraft, readSmartImport, writeSmartImport, type ImportedField } from "@/lib/mri-smart-import";

const today = () => new Date().toISOString().slice(0, 10);
const iso = (date: Date) => date.toISOString().slice(0, 10);
const moneyRound = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

function previousCompleteMonth() {
  const now = new Date();
  const firstThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(firstThisMonth.getTime() - 86_400_000);
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  return { start: iso(start), end: iso(end) };
}

function hasBusinessMri() {
  try {
    const raw = localStorage.getItem("business-lifeline-mri-v2");
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { data?: { businessName?: string } };
    return Boolean(parsed.data?.businessName?.trim());
  } catch {
    return false;
  }
}

export function NativeBooksMriSync() {
  const lastHash = useRef("");

  useEffect(() => {
    const sync = () => {
      if (!hasBusinessMri()) return;
      const store = readBooksStore();
      if (!store.journals.length && !store.docs.length && !store.bills.length) return;

      const chart = readChart();
      const period = previousCompleteMonth();
      const pnl = profitAndLoss(store, chart, period.start, period.end);
      const bs = balanceSheet(store, chart, today());
      const trial = trialBalance(store, chart, undefined, today());
      const ar = agedReceivables(store, today());
      const ap = agedPayables(store, today());

      const cashAvailable = moneyRound(trial
        .filter((row) => {
          const account = accountFor(row.account, chart);
          return account.type === "asset" && account.cashflow === "transfer" && !row.account.toLowerCase().includes("card clearing");
        })
        .reduce((sum, row) => sum + row.balance, 0));

      const accountsReceivable = moneyRound(bs.assets
        .filter((row) => /accounts receivable|trade debtor/i.test(row.account))
        .reduce((sum, row) => sum + row.amount, 0));

      const totalDebt = moneyRound(bs.liabilities
        .filter((row) => /loan|finance|mortgage|overdraft|credit card/i.test(row.account))
        .reduce((sum, row) => sum + row.amount, 0));

      const overdueInvoices = moneyRound(ar.filter((row) => row.daysOverdue > 0).reduce((sum, row) => sum + row.outstanding, 0));
      const overdueSuppliers = moneyRound(ap.filter((row) => row.daysOverdue > 0).reduce((sum, row) => sum + row.outstanding, 0));

      const fields: ImportedField[] = [
        { key: "monthlyRevenue", value: moneyRound(pnl.totalIncome), source: "Lifeline Books", confidence: "high", evidence: "Lifeline Books Profit & Loss — previous complete month", reportingPeriod: period.start + " to " + period.end },
        { key: "cashAvailable", value: cashAvailable, source: "Lifeline Books", confidence: "high", evidence: "Lifeline Books cash/bank accounts", reportingPeriod: today() },
        { key: "accountsReceivable", value: accountsReceivable, source: "Lifeline Books", confidence: "high", evidence: "Lifeline Books Balance Sheet — Accounts Receivable", reportingPeriod: today() },
        { key: "overdueInvoices", value: overdueInvoices, source: "Lifeline Books", confidence: "high", evidence: "Lifeline Books Aged Receivables — overdue balance", reportingPeriod: today() },
        { key: "totalDebt", value: totalDebt, source: "Lifeline Books", confidence: "high", evidence: "Lifeline Books debt/finance liability accounts", reportingPeriod: today() },
        { key: "overdueSuppliers", value: overdueSuppliers, source: "Lifeline Books", confidence: "high", evidence: "Lifeline Books Aged Payables — overdue balance", reportingPeriod: today() },
      ];

      const hash = JSON.stringify(fields.map((field) => [field.key, field.value, field.reportingPeriod]));
      if (hash === lastHash.current) return;
      lastHash.current = hash;

      const draft = mergeImportDraft(readSmartImport(), fields);
      writeSmartImport(draft);
    };

    sync();
    const timer = window.setInterval(sync, 15_000);
    window.addEventListener("business-lifeline-ledger-sync", sync);
    window.addEventListener("business-lifeline-operating-updated", sync);
    window.addEventListener("business-lifeline-business-switched", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("business-lifeline-ledger-sync", sync);
      window.removeEventListener("business-lifeline-operating-updated", sync);
      window.removeEventListener("business-lifeline-business-switched", sync);
    };
  }, []);

  return null;
}
