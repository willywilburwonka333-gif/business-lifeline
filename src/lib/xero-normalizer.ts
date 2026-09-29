export type XeroCell = { Value?: string };
export type XeroRow = { RowType?: string; Title?: string; Cells?: XeroCell[]; Rows?: XeroRow[] };
export type XeroReport = { Reports?: Array<{ ReportName?: string; Rows?: XeroRow[] }> };

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const numberValue = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  const negative = /^\(.*\)$/.test(trimmed) || /^-/.test(trimmed);
  const cleaned = trimmed.replace(/[^0-9.]/g, "");
  if (!cleaned) return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? (negative ? -Math.abs(parsed) : parsed) : undefined;
};

function walk(rows: XeroRow[] | undefined, output: Map<string, number>) {
  for (const row of rows ?? []) {
    const cells = row.Cells ?? [];
    const label = normalise(cells[0]?.Value || row.Title || "");
    const numeric = [...cells].reverse().map((cell) => numberValue(cell.Value)).find((value) => value !== undefined);
    if (label && numeric !== undefined) output.set(label, numeric);
    walk(row.Rows, output);
  }
}

export function xeroReportFacts(report: XeroReport) {
  const values = new Map<string, number>();
  walk(report.Reports?.[0]?.Rows, values);
  const find = (...labels: string[]) => {
    for (const [label, value] of values) {
      if (labels.some((candidate) => label === candidate || label.includes(candidate))) return value;
    }
    return undefined;
  };
  return {
    revenue: find("total income", "total revenue", "revenue", "sales"),
    expenses: find("total operating expenses", "total expenses", "expenses"),
    cash: find("total bank", "cash and cash equivalents", "bank accounts", "cash"),
    accountsReceivable: find("accounts receivable", "trade debtors"),
    accountsPayable: find("accounts payable", "trade creditors"),
    totalLiabilities: find("total liabilities"),
  };
}

export function combineXeroFacts(profitAndLoss: XeroReport, balanceSheet: XeroReport) {
  const pnl = xeroReportFacts(profitAndLoss);
  const balance = xeroReportFacts(balanceSheet);
  return {
    revenue: pnl.revenue,
    expenses: pnl.expenses,
    cash: balance.cash,
    accountsReceivable: balance.accountsReceivable,
    accountsPayable: balance.accountsPayable,
    totalDebt: balance.totalLiabilities,
  };
}
