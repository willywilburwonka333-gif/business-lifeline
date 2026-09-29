import { combineQuickBooksFacts, type QuickBooksReport } from "./quickbooks-normalizer";

const report = (rows: Array<[string, string]>): QuickBooksReport => ({
  Rows: { Row: rows.map(([label, value]) => ({ ColData: [{ value: label }, { value }] })) },
});

const facts = combineQuickBooksFacts(
  report([["Total Income", "42000.00"], ["Total Expenses", "31000.00"]]),
  report([["Cash and Cash Equivalents", "14000"], ["Accounts Receivable", "8500"], ["Accounts Payable", "6000"], ["Total Liabilities", "18000"]]),
);
if (facts.revenue !== 42000) throw new Error("P&L revenue was not normalised.");
if (facts.cash !== 14000) throw new Error("Balance-sheet cash was not normalised.");
if (facts.accountsReceivable !== 8500) throw new Error("Receivables were not normalised.");
if (facts.totalDebt !== 18000) throw new Error("Liabilities were not normalised.");
