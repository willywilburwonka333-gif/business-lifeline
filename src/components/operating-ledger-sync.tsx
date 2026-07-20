"use client";

import { useEffect } from "react";

const OPS_KEY = "business-lifeline-operating-platform-v1";
const ACCOUNTING_KEY = "business-lifeline-advanced-accounting-v1";
const STATUS_KEY = "business-lifeline-ledger-sync-status-v1";

type Line = { account: string; side: "debit" | "credit"; amount: number };
type Journal = { id: string; date: string; memo: string; lines: Line[]; source: string };
type AccountingStore = {
  journals?: Journal[];
  docs?: unknown[];
  bills?: unknown[];
  refunds?: unknown[];
  nextQuote?: number;
  nextInvoice?: number;
  nextCredit?: number;
  lockDate?: string;
};

type Sale = { id: string; total: number; payment?: string; channel?: string; createdAt?: string };
type Expense = { id: string; supplier?: string; category?: string; amount: number; date?: string };
type Invoice = { id: string; customerId?: string; amount: number; status?: string };
type OperatingStore = { sales?: Sale[]; expenses?: Expense[]; invoices?: Invoice[] };

type SyncStatus = { lastRun: string; added: number; totalAutomatic: number; warnings: string[] };

const moneyRound = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);
const journalId = (source: string) => `auto-${source.replace(/[^a-zA-Z0-9-]/g, "-")}`;
const validDate = (value?: string) => value?.slice(0, 10) || today();

function saleJournal(sale: Sale): Journal | null {
  const total = moneyRound(sale.total);
  if (total <= 0) return null;
  const gst = moneyRound(total / 11);
  const net = moneyRound(total - gst);
  const paymentAccount = sale.payment === "Cash" ? "Cash on Hand" : sale.payment === "Bank transfer" ? "Bank" : "Card Clearing";
  const source = `OPS:SALE:${sale.id}`;
  return {
    id: journalId(source),
    date: validDate(sale.createdAt),
    memo: `${sale.channel === "market" ? "Market" : "Counter"} sale ${sale.id}`,
    source,
    lines: [
      { account: paymentAccount, side: "debit", amount: total },
      { account: "Sales Revenue", side: "credit", amount: net },
      { account: "GST Payable", side: "credit", amount: gst },
    ],
  };
}

function expenseJournal(expense: Expense): Journal | null {
  const total = moneyRound(expense.amount);
  if (total <= 0) return null;
  const gst = moneyRound(total / 11);
  const net = moneyRound(total - gst);
  const source = `OPS:EXPENSE:${expense.id}`;
  return {
    id: journalId(source),
    date: validDate(expense.date),
    memo: `${expense.category || "Operating expense"}${expense.supplier ? ` · ${expense.supplier}` : ""}`,
    source,
    lines: [
      { account: expense.category || "Operating Expense", side: "debit", amount: net },
      { account: "GST Input Credit", side: "debit", amount: gst },
      { account: "Bank", side: "credit", amount: total },
    ],
  };
}

function invoiceJournals(invoice: Invoice): Journal[] {
  const total = moneyRound(invoice.amount);
  if (total <= 0 || !invoice.status || invoice.status === "draft") return [];
  const gst = moneyRound(total / 11);
  const net = moneyRound(total - gst);
  const issuedSource = `OPS:INVOICE:${invoice.id}:ISSUED`;
  const journals: Journal[] = [{
    id: journalId(issuedSource),
    date: today(),
    memo: `Invoice ${invoice.id} issued`,
    source: issuedSource,
    lines: [
      { account: "Accounts Receivable", side: "debit", amount: total },
      { account: "Sales Revenue", side: "credit", amount: net },
      { account: "GST Payable", side: "credit", amount: gst },
    ],
  }];
  if (invoice.status === "paid") {
    const paidSource = `OPS:INVOICE:${invoice.id}:PAID`;
    journals.push({
      id: journalId(paidSource),
      date: today(),
      memo: `Invoice ${invoice.id} paid`,
      source: paidSource,
      lines: [
        { account: "Bank", side: "debit", amount: total },
        { account: "Accounts Receivable", side: "credit", amount: total },
      ],
    });
  }
  return journals;
}

export function OperatingLedgerSync() {
  useEffect(() => {
    const sync = () => {
      const warnings: string[] = [];
      try {
        const operatingRaw = localStorage.getItem(OPS_KEY);
        if (!operatingRaw) {
          localStorage.setItem(STATUS_KEY, JSON.stringify({ lastRun: new Date().toISOString(), added: 0, totalAutomatic: 0, warnings: ["No Run My Business data yet"] } satisfies SyncStatus));
          window.dispatchEvent(new CustomEvent("business-lifeline-ledger-sync"));
          return;
        }
        const operating = JSON.parse(operatingRaw) as OperatingStore;
        const accountingRaw = localStorage.getItem(ACCOUNTING_KEY);
        const accounting: AccountingStore = accountingRaw ? JSON.parse(accountingRaw) : {};
        const journals = Array.isArray(accounting.journals) ? accounting.journals : [];
        const existingSources = new Set(journals.map((journal) => journal.source));
        const candidates: Journal[] = [];
        (operating.sales || []).forEach((sale) => {
          const journal = saleJournal(sale);
          if (journal) candidates.push(journal);
        });
        (operating.expenses || []).forEach((expense) => {
          const journal = expenseJournal(expense);
          if (journal) candidates.push(journal);
        });
        (operating.invoices || []).forEach((invoice) => candidates.push(...invoiceJournals(invoice)));
        const fresh = candidates.filter((journal) => !existingSources.has(journal.source));
        const lockDate = accounting.lockDate || "";
        const allowed = fresh.filter((journal) => {
          if (lockDate && journal.date <= lockDate) {
            warnings.push(`${journal.source} was not posted because ${journal.date} is inside the locked period`);
            return false;
          }
          const debit = moneyRound(journal.lines.filter((line) => line.side === "debit").reduce((sum, line) => sum + line.amount, 0));
          const credit = moneyRound(journal.lines.filter((line) => line.side === "credit").reduce((sum, line) => sum + line.amount, 0));
          if (debit !== credit) {
            warnings.push(`${journal.source} was not posted because it did not balance`);
            return false;
          }
          return true;
        });
        if (allowed.length) {
          const next: AccountingStore = {
            journals: [...allowed, ...journals],
            docs: accounting.docs || [],
            bills: accounting.bills || [],
            refunds: accounting.refunds || [],
            nextQuote: accounting.nextQuote || 1,
            nextInvoice: accounting.nextInvoice || 1,
            nextCredit: accounting.nextCredit || 1,
            lockDate,
          };
          localStorage.setItem(ACCOUNTING_KEY, JSON.stringify(next));
        }
        const totalAutomatic = [...allowed, ...journals].filter((journal) => journal.source.startsWith("OPS:")).length;
        localStorage.setItem(STATUS_KEY, JSON.stringify({ lastRun: new Date().toISOString(), added: allowed.length, totalAutomatic, warnings } satisfies SyncStatus));
        window.dispatchEvent(new CustomEvent("business-lifeline-ledger-sync"));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown automatic ledger error";
        localStorage.setItem(STATUS_KEY, JSON.stringify({ lastRun: new Date().toISOString(), added: 0, totalAutomatic: 0, warnings: [message] } satisfies SyncStatus));
        window.dispatchEvent(new CustomEvent("business-lifeline-ledger-sync"));
      }
    };
    sync();
    const timer = window.setInterval(sync, 2500);
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === OPS_KEY || event.key === ACCOUNTING_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("business-lifeline-operating-updated", sync as EventListener);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("business-lifeline-operating-updated", sync as EventListener);
    };
  }, []);
  return null;
}
