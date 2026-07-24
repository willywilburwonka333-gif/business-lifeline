import type { MriAccuracyProfile } from "./mri-accuracy-profile";
import type { BusinessData } from "./types";

export const FORECAST_WEEKS = 13;

export type ForecastWeekInput = {
  week: number;
  customerReceipts: number;
  wagesAndSuper: number;
  taxPayments: number;
  rentAndLeases: number;
  supplierPayments: number;
  loanRepayments: number;
  otherPayments: number;
  oneOffCashIn: number;
  oneOffCashOut: number;
};

export type ForecastWeekResult = ForecastWeekInput & {
  openingCash: number;
  totalCashIn: number;
  totalCashOut: number;
  closingCash: number;
};

export type CashflowForecast = {
  openingCash: number;
  weeks: ForecastWeekInput[];
};

export type CashflowForecastResult = {
  weeks: ForecastWeekResult[];
  firstShortfallWeek: number | null;
  lowestClosingCash: number;
  fundingGap: number;
  endingCash: number;
  usableRunwayWeeks: number;
  confidence: number;
  warnings: string[];
};

const safe = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
const round = (value: number) => Number(value.toFixed(2));

export function buildForecastFromMRI(data: BusinessData, profile?: MriAccuracyProfile): CashflowForecast {
  const weekly = (value: number) => round(safe(value) * 12 / 52);
  const weeklyRevenue = weekly(data.monthlyRevenue);
  const weeklyFixed = weekly(data.fixedExpenses);
  const weeklyVariable = weekly(data.variableExpenses);
  const weeklyDrawings = weekly(data.ownerDrawings);
  const weeklyLoans = weekly(data.loanRepayments);
  const weeklyPayroll = profile ? weekly(profile.monthlyWages + profile.monthlySuper) : 0;
  const supplierBaseline = profile && profile.accountsPayable > 0
    ? Math.max(weeklyVariable, round(profile.nextThirtyDayCreditors / 4))
    : weeklyVariable;
  const base: ForecastWeekInput = {
    week: 1,
    customerReceipts: weeklyRevenue,
    wagesAndSuper: weeklyPayroll,
    taxPayments: 0,
    rentAndLeases: weeklyFixed,
    supplierPayments: supplierBaseline,
    loanRepayments: weeklyLoans,
    otherPayments: weeklyDrawings,
    oneOffCashIn: 0,
    oneOffCashOut: 0,
  };

  const weeks = Array.from({ length: FORECAST_WEEKS }, (_, index) => ({ ...base, week: index + 1 }));
  if (profile) {
    weeks[0].oneOffCashIn = safe(profile.oneOffIncome);
    weeks[0].oneOffCashOut = safe(profile.oneOffExpenses);
    weeks[0].taxPayments = safe(profile.paygOutstanding);
  }

  return {
    openingCash: safe(data.cashAvailable) + safe(profile?.availableFacilities ?? 0) + safe(profile?.overdraftLimit ?? 0),
    weeks,
  };
}

export function calculateCashflowForecast(forecast: CashflowForecast): CashflowForecastResult {
  let cash = safe(forecast.openingCash);
  let lowest = cash;
  let firstShortfallWeek: number | null = null;
  let completedFields = 1;
  let possibleFields = 1;

  const weeks = Array.from({ length: FORECAST_WEEKS }, (_, index) => {
    const input = forecast.weeks[index] ?? {
      week: index + 1,
      customerReceipts: 0,
      wagesAndSuper: 0,
      taxPayments: 0,
      rentAndLeases: 0,
      supplierPayments: 0,
      loanRepayments: 0,
      otherPayments: 0,
      oneOffCashIn: 0,
      oneOffCashOut: 0,
    };
    const openingCash = cash;
    const cashInFields = [input.customerReceipts, input.oneOffCashIn];
    const cashOutFields = [input.wagesAndSuper, input.taxPayments, input.rentAndLeases, input.supplierPayments, input.loanRepayments, input.otherPayments, input.oneOffCashOut];
    possibleFields += cashInFields.length + cashOutFields.length;
    completedFields += [...cashInFields, ...cashOutFields].filter((value) => Number.isFinite(value) && value >= 0).length;
    const totalCashIn = cashInFields.reduce((sum, value) => sum + safe(value), 0);
    const totalCashOut = cashOutFields.reduce((sum, value) => sum + safe(value), 0);
    cash = round(openingCash + totalCashIn - totalCashOut);
    lowest = Math.min(lowest, cash);
    if (cash < 0 && firstShortfallWeek === null) firstShortfallWeek = index + 1;
    return {
      ...input,
      week: index + 1,
      openingCash: round(openingCash),
      totalCashIn: round(totalCashIn),
      totalCashOut: round(totalCashOut),
      closingCash: cash,
    };
  });

  const warnings: string[] = [];
  if (firstShortfallWeek !== null) warnings.push(`Cash is forecast to fall below zero in week ${firstShortfallWeek}.`);
  if (lowest < 0) warnings.push(`The current plan requires at least ${round(Math.abs(lowest))} of additional cash or payment relief.`);
  const weeksWithTax = weeks.filter((week) => week.taxPayments > 0).length;
  const weeksWithWages = weeks.filter((week) => week.wagesAndSuper > 0).length;
  if (weeksWithTax === 0) warnings.push("No tax payments are included. Add known BAS, PAYG, GST or other tax commitments.");
  if (weeksWithWages === 0) warnings.push("No wages or super are included. Confirm this is correct before relying on the forecast.");

  return {
    weeks,
    firstShortfallWeek,
    lowestClosingCash: round(lowest),
    fundingGap: round(Math.max(0, -lowest)),
    endingCash: round(cash),
    usableRunwayWeeks: firstShortfallWeek === null ? FORECAST_WEEKS : Math.max(0, firstShortfallWeek - 1),
    confidence: Math.round((completedFields / possibleFields) * 100),
    warnings,
  };
}
