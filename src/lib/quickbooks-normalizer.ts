export type QuickBooksReportRow = {
  ColData?: Array<{ value?: string }>;
  Rows?: { Row?: QuickBooksReportRow[] };
  Summary?: { ColData?: Array<{ value?: string }> };
};

export type QuickBooksReport = { Rows?: { Row?: QuickBooksReportRow[] } };

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const amount = (value?: string) => {
  if (!value) return undefined;
  const parsed = Number(value.replace(/[$,()]/g, (match) => match === "(" ? "-" : ""));
  return Number.isFinite(parsed) ? Math.abs(parsed) : undefined;
};

function walk(rows: QuickBooksReportRow[] | undefined, output: Map<string, number>) {
  for (const row of rows ?? []) {
    const cells = row.ColData ?? row.Summary?.ColData ?? [];
    const label = normalise(cells[0]?.value ?? "");
    const numeric = [...cells].reverse().map((cell) => amount(cell.value)).find((value) => value !== undefined);
    if (label && numeric !== undefined) output.set(label, numeric);
    walk(row.Rows?.Row, output);
  }
}

export function reportFacts(report: QuickBooksReport) {
  const values = new Map<string, number>();
  walk(report.Rows?.Row, values);
  const find = (...labels: string[]) => {
    for (const [label, value] of values) if (labels.some((candidate) => label === candidate || label.includes(candidate))) return value;
    return undefined;
  };
  return {
    revenue: find("total income", "total revenue", "income"),
    expenses: find("total expenses", "total expense"),
    cash: find("total bank accounts", "cash and cash equivalents", "cash"),
    accountsReceivable: find("accounts receivable", "a r"),
    accountsPayable: find("accounts payable", "a p"),
    borrowings: find("total borrowings", "borrowings", "bank loans", "business loans", "loans payable", "finance lease liabilities", "lease liabilities"),
    totalLiabilities: find("total liabilities"),
  };
}

export function combineQuickBooksFacts(profitAndLoss: QuickBooksReport, balanceSheet: QuickBooksReport) {
  const pnl = reportFacts(profitAndLoss);
  const balance = reportFacts(balanceSheet);
  return {
    revenue: pnl.revenue,
    expenses: pnl.expenses,
    cash: balance.cash,
    accountsReceivable: balance.accountsReceivable,
    accountsPayable: balance.accountsPayable,
    totalDebt: balance.borrowings,
    totalLiabilities: balance.totalLiabilities,
  };
}
