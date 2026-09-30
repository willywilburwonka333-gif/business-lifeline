export const LIFELINE_BOOKS_KEY = "business-lifeline-advanced-accounting-v1";
export const LIFELINE_BOOKS_SETTINGS_KEY = "business-lifeline-books-settings-v1";

export type AccountType = "asset" | "liability" | "equity" | "income" | "cogs" | "expense";
export type CashflowClass = "operating" | "investing" | "financing" | "transfer";

export type LifelineAccount = {
  code: string;
  name: string;
  type: AccountType;
  cashflow: CashflowClass;
  gstDefault?: "gst" | "free" | "input";
  active: boolean;
  system?: boolean;
};

export type LedgerLine = { account: string; side: "debit" | "credit"; amount: number };
export type LedgerJournal = { id: string; date: string; memo: string; lines: LedgerLine[]; source: string };
export type SalesItem = { description: string; qty: number; rate: number; gst: "gst" | "free" | "input" };
export type SalesDocument = {
  id: string;
  number: string;
  kind: "quote" | "invoice" | "credit";
  customer: string;
  date: string;
  due: string;
  status: "draft" | "sent" | "accepted" | "part-paid" | "paid" | "void";
  items: SalesItem[];
  payments: number;
  notes: string;
};
export type SupplierBill = {
  id: string;
  number: string;
  supplier: string;
  date: string;
  due: string;
  amount: number;
  gst: number;
  status: "draft" | "approved" | "part-paid" | "paid";
  paid: number;
};
export type BooksStore = {
  journals: LedgerJournal[];
  docs: SalesDocument[];
  bills: SupplierBill[];
  refunds: unknown[];
  nextQuote: number;
  nextInvoice: number;
  nextCredit: number;
  lockDate: string;
};

export type TrialBalanceRow = {
  code: string;
  account: string;
  type: AccountType;
  debit: number;
  credit: number;
  rawBalance: number;
  balance: number;
};

export type FinancialReportRow = { account: string; code: string; amount: number };

export type ProfitAndLoss = {
  income: FinancialReportRow[];
  costOfSales: FinancialReportRow[];
  expenses: FinancialReportRow[];
  totalIncome: number;
  totalCostOfSales: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
};

export type BalanceSheet = {
  assets: FinancialReportRow[];
  liabilities: FinancialReportRow[];
  equity: FinancialReportRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netAssets: number;
  equationDifference: number;
};

export type CashflowSummary = {
  operating: number;
  investing: number;
  financing: number;
  transfers: number;
  netMovement: number;
};

export type AgingBucket = "Current" | "1–30" | "31–60" | "61–90" | "90+";
export type AgingRow = {
  id: string;
  party: string;
  reference: string;
  issueDate: string;
  dueDate: string;
  outstanding: number;
  daysOverdue: number;
  bucket: AgingBucket;
};

export type GstSummary = {
  taxableSales: number;
  gstOnSales: number;
  gstFreeSales: number;
  inputTaxedSales: number;
  purchasesIncludingGst: number;
  gstCredits: number;
  estimatedNetGst: number;
};

export const DEFAULT_CHART: LifelineAccount[] = [
  { code: "1000", name: "Bank", type: "asset", cashflow: "transfer", active: true, system: true },
  { code: "1010", name: "Cash on Hand", type: "asset", cashflow: "transfer", active: true, system: true },
  { code: "1020", name: "Card Clearing", type: "asset", cashflow: "transfer", active: true, system: true },
  { code: "1100", name: "Accounts Receivable", type: "asset", cashflow: "operating", active: true, system: true },
  { code: "1200", name: "Inventory", type: "asset", cashflow: "operating", active: true, system: true },
  { code: "1300", name: "Prepayments", type: "asset", cashflow: "operating", active: true },
  { code: "1500", name: "Plant & Equipment", type: "asset", cashflow: "investing", active: true },
  { code: "1590", name: "Accumulated Depreciation", type: "asset", cashflow: "investing", active: true },
  { code: "2000", name: "Accounts Payable", type: "liability", cashflow: "operating", active: true, system: true },
  { code: "2050", name: "Customer Deposits", type: "liability", cashflow: "operating", active: true, system: true },
  { code: "2060", name: "Employee Reimbursements Payable", type: "liability", cashflow: "operating", active: true, system: true },
  { code: "2100", name: "GST Payable", type: "liability", cashflow: "operating", active: true, system: true },
  { code: "2110", name: "GST Input Credit", type: "asset", cashflow: "operating", active: true, system: true },
  { code: "2200", name: "PAYG Withholding Payable", type: "liability", cashflow: "operating", active: true, system: true },
  { code: "2210", name: "Superannuation Payable", type: "liability", cashflow: "operating", active: true, system: true },
  { code: "2250", name: "Payroll Clearing", type: "liability", cashflow: "operating", active: true, system: true },
  { code: "2300", name: "Tax Payable", type: "liability", cashflow: "operating", active: true },
  { code: "2500", name: "Business Loan", type: "liability", cashflow: "financing", active: true },
  { code: "3000", name: "Owner Equity", type: "equity", cashflow: "financing", active: true, system: true },
  { code: "3100", name: "Owner Drawings", type: "equity", cashflow: "financing", active: true },
  { code: "3200", name: "Retained Earnings", type: "equity", cashflow: "financing", active: true },
  { code: "4000", name: "Sales Revenue", type: "income", cashflow: "operating", gstDefault: "gst", active: true, system: true },
  { code: "4010", name: "Service Revenue", type: "income", cashflow: "operating", gstDefault: "gst", active: true },
  { code: "4090", name: "Sales Returns", type: "income", cashflow: "operating", gstDefault: "gst", active: true, system: true },
  { code: "5000", name: "Cost of Goods Sold", type: "cogs", cashflow: "operating", gstDefault: "gst", active: true },
  { code: "6000", name: "Operating Expense", type: "expense", cashflow: "operating", gstDefault: "gst", active: true, system: true },
  { code: "6010", name: "Expense", type: "expense", cashflow: "operating", gstDefault: "gst", active: true, system: true },
  { code: "6100", name: "Wages & Salaries", type: "expense", cashflow: "operating", active: true, system: true },
  { code: "6110", name: "Superannuation Expense", type: "expense", cashflow: "operating", active: true, system: true },
  { code: "6200", name: "Rent", type: "expense", cashflow: "operating", gstDefault: "gst", active: true },
  { code: "6210", name: "Utilities", type: "expense", cashflow: "operating", gstDefault: "gst", active: true },
  { code: "6220", name: "Advertising & Marketing", type: "expense", cashflow: "operating", gstDefault: "gst", active: true },
  { code: "6230", name: "Insurance", type: "expense", cashflow: "operating", gstDefault: "gst", active: true },
  { code: "6240", name: "Motor Vehicle", type: "expense", cashflow: "operating", gstDefault: "gst", active: true },
  { code: "6250", name: "Repairs & Maintenance", type: "expense", cashflow: "operating", gstDefault: "gst", active: true },
  { code: "6260", name: "Professional Fees", type: "expense", cashflow: "operating", gstDefault: "gst", active: true },
  { code: "6270", name: "Bank & Merchant Fees", type: "expense", cashflow: "operating", active: true },
  { code: "6300", name: "Depreciation", type: "expense", cashflow: "investing", active: true },
  { code: "6400", name: "Interest Expense", type: "expense", cashflow: "financing", active: true },
];

const EMPTY: BooksStore = { journals: [], docs: [], bills: [], refunds: [], nextQuote: 1, nextInvoice: 1, nextCredit: 1, lockDate: "" };
const round = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function readBooksStore(storage?: Storage): BooksStore {
  try {
    const target = storage ?? (typeof window !== "undefined" ? window.localStorage : null);
    if (!target) return EMPTY;
    const raw = target.getItem(LIFELINE_BOOKS_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<BooksStore>;
    return {
      ...EMPTY,
      ...parsed,
      journals: Array.isArray(parsed.journals) ? parsed.journals : [],
      docs: Array.isArray(parsed.docs) ? parsed.docs : [],
      bills: Array.isArray(parsed.bills) ? parsed.bills : [],
      refunds: Array.isArray(parsed.refunds) ? parsed.refunds : [],
    };
  } catch {
    return EMPTY;
  }
}

export function readChart(storage?: Storage): LifelineAccount[] {
  try {
    const target = storage ?? (typeof window !== "undefined" ? window.localStorage : null);
    if (!target) return DEFAULT_CHART;
    const raw = target.getItem(LIFELINE_BOOKS_SETTINGS_KEY);
    if (!raw) return DEFAULT_CHART;
    const parsed = JSON.parse(raw) as { customAccounts?: LifelineAccount[] };
    const custom = Array.isArray(parsed.customAccounts) ? parsed.customAccounts : [];
    const byName = new Map(DEFAULT_CHART.map((account) => [normalise(account.name), account]));
    for (const account of custom) byName.set(normalise(account.name), account);
    return [...byName.values()].sort((a, b) => a.code.localeCompare(b.code));
  } catch {
    return DEFAULT_CHART;
  }
}

export function accountFor(name: string, chart = DEFAULT_CHART): LifelineAccount {
  const key = normalise(name);
  const exact = chart.find((account) => normalise(account.name) === key);
  if (exact) return exact;

  const aliases: Array<[RegExp, Partial<LifelineAccount> & { name: string }]> = [
    [/bank|cheque|checking|savings/, { name, type: "asset", cashflow: "transfer" }],
    [/cash/, { name, type: "asset", cashflow: "transfer" }],
    [/receivable|debtor/, { name, type: "asset", cashflow: "operating" }],
    [/inventory|stock/, { name, type: "asset", cashflow: "operating" }],
    [/equipment|vehicle|plant|asset/, { name, type: "asset", cashflow: "investing" }],
    [/payable|creditor/, { name, type: "liability", cashflow: "operating" }],
    [/gst payable|payg|super.*payable|tax payable/, { name, type: "liability", cashflow: "operating" }],
    [/loan|finance|mortgage/, { name, type: "liability", cashflow: "financing" }],
    [/equity|capital|retained/, { name, type: "equity", cashflow: "financing" }],
    [/drawing/, { name, type: "equity", cashflow: "financing" }],
    [/sale|revenue|income/, { name, type: "income", cashflow: "operating" }],
    [/cost of goods|cogs|direct cost/, { name, type: "cogs", cashflow: "operating" }],
    [/interest/, { name, type: "expense", cashflow: "financing" }],
    [/depreciation/, { name, type: "expense", cashflow: "investing" }],
  ];
  const inferred = aliases.find(([pattern]) => pattern.test(key))?.[1];
  return {
    code: "9999",
    name,
    type: inferred?.type ?? "expense",
    cashflow: inferred?.cashflow ?? "operating",
    active: true,
  };
}

function inPeriod(date: string, start?: string, end?: string) {
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

export function validateJournal(journal: LedgerJournal) {
  const debit = round(journal.lines.filter((line) => line.side === "debit").reduce((sum, line) => sum + line.amount, 0));
  const credit = round(journal.lines.filter((line) => line.side === "credit").reduce((sum, line) => sum + line.amount, 0));
  return { balanced: debit === credit, debit, credit, difference: round(debit - credit) };
}

export function trialBalance(store: BooksStore, chart = DEFAULT_CHART, start?: string, end?: string): TrialBalanceRow[] {
  const map = new Map<string, { debit: number; credit: number }>();
  for (const journal of store.journals) {
    if (!inPeriod(journal.date, start, end)) continue;
    for (const line of journal.lines) {
      const value = map.get(line.account) ?? { debit: 0, credit: 0 };
      value[line.side] = round(value[line.side] + line.amount);
      map.set(line.account, value);
    }
  }
  return [...map.entries()].map(([name, movement]) => {
    const account = accountFor(name, chart);
    const rawBalance = round(movement.debit - movement.credit);
    const normalDebit = account.type === "asset" || account.type === "expense" || account.type === "cogs";
    return {
      code: account.code,
      account: name,
      type: account.type,
      debit: round(movement.debit),
      credit: round(movement.credit),
      rawBalance,
      balance: round(normalDebit ? rawBalance : -rawBalance),
    };
  }).sort((a, b) => a.code.localeCompare(b.code) || a.account.localeCompare(b.account));
}

const rowsFor = (trial: TrialBalanceRow[], type: AccountType): FinancialReportRow[] =>
  trial.filter((row) => row.type === type && Math.abs(row.balance) >= 0.005).map((row) => ({ account: row.account, code: row.code, amount: row.balance }));

const sumRows = (rows: FinancialReportRow[]) => round(rows.reduce((sum, row) => sum + row.amount, 0));

export function profitAndLoss(store: BooksStore, chart = DEFAULT_CHART, start?: string, end?: string): ProfitAndLoss {
  const trial = trialBalance(store, chart, start, end);
  const income = rowsFor(trial, "income");
  const costOfSales = rowsFor(trial, "cogs");
  const expenses = rowsFor(trial, "expense");
  const totalIncome = sumRows(income);
  const totalCostOfSales = sumRows(costOfSales);
  const grossProfit = round(totalIncome - totalCostOfSales);
  const totalExpenses = sumRows(expenses);
  return { income, costOfSales, expenses, totalIncome, totalCostOfSales, grossProfit, totalExpenses, netProfit: round(grossProfit - totalExpenses) };
}

export function balanceSheet(store: BooksStore, chart = DEFAULT_CHART, asAt?: string): BalanceSheet {
  const trial = trialBalance(store, chart, undefined, asAt);
  const assets = rowsFor(trial, "asset");
  const liabilities = rowsFor(trial, "liability");
  const equity = rowsFor(trial, "equity");
  const currentProfit = profitAndLoss(store, chart, undefined, asAt).netProfit;
  const totalAssets = sumRows(assets);
  const totalLiabilities = sumRows(liabilities);
  const recordedEquity = sumRows(equity);
  const totalEquity = round(recordedEquity + currentProfit);
  const netAssets = round(totalAssets - totalLiabilities);
  return {
    assets,
    liabilities,
    equity: [...equity, ...(Math.abs(currentProfit) >= 0.005 ? [{ account: "Current Earnings", code: "3299", amount: currentProfit }] : [])],
    totalAssets,
    totalLiabilities,
    totalEquity,
    netAssets,
    equationDifference: round(totalAssets - totalLiabilities - totalEquity),
  };
}

function isCashAccount(name: string) {
  const value = normalise(name);
  return value === "bank" || value.includes("cash on hand") || value.includes("card clearing") || value.includes("business account");
}

export function cashflowSummary(store: BooksStore, chart = DEFAULT_CHART, start?: string, end?: string): CashflowSummary {
  let operating = 0;
  let investing = 0;
  let financing = 0;
  let transfers = 0;
  for (const journal of store.journals) {
    if (!inPeriod(journal.date, start, end)) continue;
    const cashLines = journal.lines.filter((line) => isCashAccount(line.account));
    if (!cashLines.length) continue;
    const cashMovement = round(cashLines.reduce((sum, line) => sum + (line.side === "debit" ? line.amount : -line.amount), 0));
    if (cashMovement === 0) continue;
    const counterparts = journal.lines.filter((line) => !isCashAccount(line.account));
    const classes = counterparts.map((line) => accountFor(line.account, chart).cashflow);
    const classification: CashflowClass =
      classes.includes("financing") ? "financing" :
      classes.includes("investing") ? "investing" :
      classes.every((value) => value === "transfer") ? "transfer" : "operating";
    if (classification === "operating") operating = round(operating + cashMovement);
    else if (classification === "investing") investing = round(investing + cashMovement);
    else if (classification === "financing") financing = round(financing + cashMovement);
    else transfers = round(transfers + cashMovement);
  }
  return { operating, investing, financing, transfers, netMovement: round(operating + investing + financing + transfers) };
}

export function generalLedger(store: BooksStore, accountName?: string, start?: string, end?: string) {
  const rows: Array<{ journalId: string; date: string; memo: string; source: string; account: string; debit: number; credit: number }> = [];
  for (const journal of store.journals) {
    if (!inPeriod(journal.date, start, end)) continue;
    for (const line of journal.lines) {
      if (accountName && normalise(line.account) !== normalise(accountName)) continue;
      rows.push({
        journalId: journal.id,
        date: journal.date,
        memo: journal.memo,
        source: journal.source,
        account: line.account,
        debit: line.side === "debit" ? round(line.amount) : 0,
        credit: line.side === "credit" ? round(line.amount) : 0,
      });
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

function docTotal(items: SalesItem[]) {
  return round(items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0), 0));
}
function daysBetween(earlier: string, later: string) {
  if (!earlier) return 0;
  const start = new Date(earlier + "T00:00:00Z").getTime();
  const end = new Date(later + "T00:00:00Z").getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.floor((end - start) / 86_400_000);
}
function bucketFor(daysOverdue: number): AgingBucket {
  if (daysOverdue <= 0) return "Current";
  if (daysOverdue <= 30) return "1–30";
  if (daysOverdue <= 60) return "31–60";
  if (daysOverdue <= 90) return "61–90";
  return "90+";
}

export function agedReceivables(store: BooksStore, asAt = new Date().toISOString().slice(0, 10)): AgingRow[] {
  return store.docs
    .filter((doc) => doc.kind === "invoice" && doc.status !== "paid" && doc.status !== "void" && doc.status !== "draft")
    .map((doc) => {
      const outstanding = round(Math.max(0, docTotal(doc.items) - Number(doc.payments || 0)));
      const dueDate = doc.due || doc.date;
      const daysOverdue = Math.max(0, daysBetween(dueDate, asAt));
      return { id: doc.id, party: doc.customer, reference: doc.number, issueDate: doc.date, dueDate, outstanding, daysOverdue, bucket: bucketFor(daysOverdue) };
    })
    .filter((row) => row.outstanding > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export function agedPayables(store: BooksStore, asAt = new Date().toISOString().slice(0, 10)): AgingRow[] {
  return store.bills
    .filter((bill) => bill.status !== "paid" && bill.status !== "draft")
    .map((bill) => {
      const outstanding = round(Math.max(0, Number(bill.amount || 0) - Number(bill.paid || 0)));
      const dueDate = bill.due || bill.date;
      const daysOverdue = Math.max(0, daysBetween(dueDate, asAt));
      return { id: bill.id, party: bill.supplier, reference: bill.number, issueDate: bill.date, dueDate, outstanding, daysOverdue, bucket: bucketFor(daysOverdue) };
    })
    .filter((row) => row.outstanding > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export function agingTotals(rows: AgingRow[]) {
  const buckets: Record<AgingBucket, number> = { Current: 0, "1–30": 0, "31–60": 0, "61–90": 0, "90+": 0 };
  for (const row of rows) buckets[row.bucket] = round(buckets[row.bucket] + row.outstanding);
  return { ...buckets, total: round(rows.reduce((sum, row) => sum + row.outstanding, 0)) };
}

export function gstSummary(store: BooksStore, start?: string, end?: string): GstSummary {
  let taxableSales = 0;
  let gstOnSales = 0;
  let gstFreeSales = 0;
  let inputTaxedSales = 0;
  for (const doc of store.docs) {
    if (doc.kind !== "invoice" || doc.status === "void" || doc.status === "draft" || !inPeriod(doc.date, start, end)) continue;
    for (const item of doc.items) {
      const amount = round(Number(item.qty || 0) * Number(item.rate || 0));
      if (item.gst === "gst") {
        taxableSales = round(taxableSales + amount);
        gstOnSales = round(gstOnSales + amount / 11);
      } else if (item.gst === "free") gstFreeSales = round(gstFreeSales + amount);
      else inputTaxedSales = round(inputTaxedSales + amount);
    }
  }
  let purchasesIncludingGst = 0;
  let gstCredits = 0;
  for (const bill of store.bills) {
    if (bill.status === "draft" || !inPeriod(bill.date, start, end)) continue;
    purchasesIncludingGst = round(purchasesIncludingGst + Number(bill.amount || 0));
    gstCredits = round(gstCredits + Number(bill.gst || 0));
  }
  return { taxableSales, gstOnSales, gstFreeSales, inputTaxedSales, purchasesIncludingGst, gstCredits, estimatedNetGst: round(gstOnSales - gstCredits) };
}

export function booksIntegrity(store: BooksStore) {
  const unbalanced = store.journals.filter((journal) => !validateJournal(journal).balanced);
  const duplicateSources = new Map<string, number>();
  for (const journal of store.journals) duplicateSources.set(journal.source, (duplicateSources.get(journal.source) ?? 0) + 1);
  const duplicates = [...duplicateSources.entries()].filter(([source, count]) => source && count > 1).map(([source, count]) => ({ source, count }));
  const lockedViolations = store.lockDate ? store.journals.filter((journal) => journal.date <= store.lockDate && journal.source.startsWith("OPS:")) : [];
  const trial = trialBalance(store);
  const totalDebit = round(trial.reduce((sum, row) => sum + row.debit, 0));
  const totalCredit = round(trial.reduce((sum, row) => sum + row.credit, 0));
  return { journalCount: store.journals.length, unbalanced, duplicates, lockedViolations, totalDebit, totalCredit, balanced: totalDebit === totalCredit && unbalanced.length === 0 };
}
