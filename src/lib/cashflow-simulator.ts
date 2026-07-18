import type { BusinessData } from "./types";

export type CashflowAssumptions = {
  priceChangePercent: number;
  salesVolumeChangePercent: number;
  fixedCostChangePercent: number;
  variableCostChangePercent: number;
  ownerDrawingsChange: number;
  loanRepaymentChange: number;
  invoicesCollected: number;
  extraCashInjection: number;
};

export const emptyCashflowAssumptions = (): CashflowAssumptions => ({
  priceChangePercent: 0,
  salesVolumeChangePercent: 0,
  fixedCostChangePercent: 0,
  variableCostChangePercent: 0,
  ownerDrawingsChange: 0,
  loanRepaymentChange: 0,
  invoicesCollected: 0,
  extraCashInjection: 0,
});

const clampPercent = (value: number) => Math.max(-100, Math.min(300, Number.isFinite(value) ? value : 0));
const nonNegative = (value: number) => Math.max(0, Number.isFinite(value) ? value : 0);

export function applyCashflowAssumptions(data: BusinessData, assumptions: CashflowAssumptions): BusinessData {
  const priceMultiplier = 1 + clampPercent(assumptions.priceChangePercent) / 100;
  const volumeMultiplier = 1 + clampPercent(assumptions.salesVolumeChangePercent) / 100;
  const revenueMultiplier = Math.max(0, priceMultiplier * volumeMultiplier);
  const projectedRevenue = data.monthlyRevenue * revenueMultiplier;

  return {
    ...data,
    monthlyRevenue: nonNegative(projectedRevenue),
    fixedExpenses: nonNegative(data.fixedExpenses * (1 + clampPercent(assumptions.fixedCostChangePercent) / 100)),
    variableExpenses: nonNegative(data.variableExpenses * volumeMultiplier * (1 + clampPercent(assumptions.variableCostChangePercent) / 100)),
    ownerDrawings: nonNegative(data.ownerDrawings + assumptions.ownerDrawingsChange),
    loanRepayments: nonNegative(data.loanRepayments + assumptions.loanRepaymentChange),
    cashAvailable: nonNegative(data.cashAvailable + assumptions.invoicesCollected + assumptions.extraCashInjection),
    accountsReceivable: nonNegative(data.accountsReceivable - assumptions.invoicesCollected),
    overdueInvoices: nonNegative(data.overdueInvoices - assumptions.invoicesCollected),
  };
}

export type SimulationImpact = {
  key: keyof CashflowAssumptions;
  label: string;
  monthlyImpact: number;
  cashImpact: number;
};

export function rankSimulationImpacts(data: BusinessData, assumptions: CashflowAssumptions): SimulationImpact[] {
  const impacts: SimulationImpact[] = [
    {
      key: "priceChangePercent",
      label: "Price change",
      monthlyImpact: data.monthlyRevenue * (clampPercent(assumptions.priceChangePercent) / 100) * (1 + clampPercent(assumptions.salesVolumeChangePercent) / 100),
      cashImpact: 0,
    },
    {
      key: "salesVolumeChangePercent",
      label: "Sales volume change",
      monthlyImpact: data.monthlyRevenue * (clampPercent(assumptions.salesVolumeChangePercent) / 100) - data.variableExpenses * (clampPercent(assumptions.salesVolumeChangePercent) / 100),
      cashImpact: 0,
    },
    {
      key: "fixedCostChangePercent",
      label: "Fixed-cost change",
      monthlyImpact: -(data.fixedExpenses * (clampPercent(assumptions.fixedCostChangePercent) / 100)),
      cashImpact: 0,
    },
    {
      key: "variableCostChangePercent",
      label: "Variable-cost change",
      monthlyImpact: -(data.variableExpenses * (1 + clampPercent(assumptions.salesVolumeChangePercent) / 100) * (clampPercent(assumptions.variableCostChangePercent) / 100)),
      cashImpact: 0,
    },
    {
      key: "ownerDrawingsChange",
      label: "Owner drawings change",
      monthlyImpact: -assumptions.ownerDrawingsChange,
      cashImpact: 0,
    },
    {
      key: "loanRepaymentChange",
      label: "Loan repayment change",
      monthlyImpact: -assumptions.loanRepaymentChange,
      cashImpact: 0,
    },
    {
      key: "invoicesCollected",
      label: "Invoice collection",
      monthlyImpact: 0,
      cashImpact: nonNegative(assumptions.invoicesCollected),
    },
    {
      key: "extraCashInjection",
      label: "Extra cash injection",
      monthlyImpact: 0,
      cashImpact: nonNegative(assumptions.extraCashInjection),
    },
  ];

  return impacts
    .filter((item) => Math.abs(item.monthlyImpact) > 0.01 || Math.abs(item.cashImpact) > 0.01)
    .sort((a, b) => Math.abs(b.monthlyImpact) + Math.abs(b.cashImpact) - (Math.abs(a.monthlyImpact) + Math.abs(a.cashImpact)));
}
