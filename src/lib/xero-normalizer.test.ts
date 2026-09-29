import { combineXeroFacts, type XeroReport } from "./xero-normalizer";

const report = (rows: Array<[string, string]>): XeroReport => ({
  Reports: [{ Rows: rows.map(([label, value]) => ({ RowType: "Row", Cells: [{ Value: label }, { Value: value }] })) }],
});

const facts = combineXeroFacts(
  report([["Total Income", "42000.00"], ["Total Expenses", "31000.00"]]),
  report([["Cash and Cash Equivalents", "14000"], ["Accounts Receivable", "8500"], ["Accounts Payable", "6000"], ["Total Liabilities", "18000"]]),
);
if (facts.revenue !== 42000) throw new Error("Xero P&L revenue was not normalised.");
if (facts.cash !== 14000) throw new Error("Xero balance-sheet cash was not normalised.");
if (facts.accountsReceivable !== 8500) throw new Error("Xero receivables were not normalised.");
if (facts.totalDebt !== 18000) throw new Error("Xero liabilities were not normalised.");
