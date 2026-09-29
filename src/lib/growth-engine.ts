import type { SavedReport } from "./saved-report";

export const GROWTH_PLAN_KEY = "business-lifeline-growth-plan-v1";
export const OPERATING_KEY = "business-lifeline-operating-platform-v1";
export const LIVE_CONTROL_KEY = "business-lifeline-live-control-v1";

export type GrowthInitiativeStatus = "idea" | "testing" | "scale" | "stop" | "complete";
export type GrowthInitiative = {
  id: string;
  name: string;
  hypothesis: string;
  cost: number;
  expectedMonthlyRevenue: number;
  expectedMonthlyGrossProfit: number;
  actualMonthlyRevenue: number;
  actualMonthlyGrossProfit: number;
  owner: string;
  reviewDate: string;
  status: GrowthInitiativeStatus;
};

export type GrowthSegment = {
  id: string;
  name: string;
  customers: number;
  monthlyRevenue: number;
  grossMarginPercent: number;
  repeatRatePercent: number;
};

export type GrowthPlan = {
  annualRevenueTarget: number;
  targetOperatingMargin: number;
  targetMonthlyOwnerIncome: number;
  targetCashBufferMonths: number;
  targetDate: string;
  strategy: string;
  recurringRevenuePercent?: number;
  repeatCustomerPercent?: number;
  capacityUtilisationPercent?: number;
  ownerHoursPerWeek?: number;
  monthlyGrowthBudget?: number;
  largestCustomerPercent?: number;
  segments?: GrowthSegment[];
  initiatives: GrowthInitiative[];
};

export type OperatingSnapshot = {
  customers: number;
  products: number;
  sales30: number;
  sales90: number;
  pipeline: number;
  lowStock: number;
  activeJobs: number;
  openTasks: number;
  averageCatalogueMargin?: number;
  lowMarginItems?: number;
};

const emptyPlan = (): GrowthPlan => ({
  annualRevenueTarget: 0,
  targetOperatingMargin: 15,
  targetMonthlyOwnerIncome: 0,
  targetCashBufferMonths: 3,
  targetDate: "",
  strategy: "",
  recurringRevenuePercent: 0,
  repeatCustomerPercent: 0,
  capacityUtilisationPercent: 0,
  ownerHoursPerWeek: 0,
  monthlyGrowthBudget: 0,
  largestCustomerPercent: 0,
  segments: [],
  initiatives: [],
});

export function readGrowthPlan(storage: Storage = window.localStorage): GrowthPlan {
  try {
    const raw = storage.getItem(GROWTH_PLAN_KEY);
    return raw ? { ...emptyPlan(), ...JSON.parse(raw) } : emptyPlan();
  } catch {
    return emptyPlan();
  }
}

export function readOperatingSnapshot(storage: Storage = window.localStorage): OperatingSnapshot {
  try {
    const raw = storage.getItem(OPERATING_KEY);
    if (!raw) return { customers: 0, products: 0, sales30: 0, sales90: 0, pipeline: 0, lowStock: 0, activeJobs: 0, openTasks: 0, averageCatalogueMargin: 0, lowMarginItems: 0 };
    const store = JSON.parse(raw) as {
      customers?: unknown[];
      products?: Array<{ qty?: number; reorder?: number; price?: number; cost?: number }>;
      sales?: Array<{ total?: number; createdAt?: string }>;
      quotes?: Array<{ status?: string; amount?: number; items?: Array<{ qty?: number; price?: number }> }>;
      jobs?: Array<{ status?: string }>;
      tasks?: Array<{ done?: boolean }>;
    };
    const now = Date.now();
    const within = (date: string | undefined, days: number) => !date || now - new Date(date).getTime() <= days * 86400000;
    const sales30 = (store.sales ?? []).filter((sale) => within(sale.createdAt, 30)).reduce((sum, sale) => sum + Number(sale.total ?? 0), 0);
    const sales90 = (store.sales ?? []).filter((sale) => within(sale.createdAt, 90)).reduce((sum, sale) => sum + Number(sale.total ?? 0), 0);
    const pipeline = (store.quotes ?? []).filter((quote) => ["draft", "sent"].includes(quote.status ?? "draft")).reduce((sum, quote) => {
      if (typeof quote.amount === "number") return sum + quote.amount;
      return sum + (quote.items ?? []).reduce((lineTotal, line) => lineTotal + Number(line.qty ?? 0) * Number(line.price ?? 0), 0);
    }, 0);
    const products = store.products ?? [];
    const marginValues = products.filter((product) => Number(product.price ?? 0) > 0).map((product) => (Number(product.price ?? 0) - Number(product.cost ?? 0)) / Number(product.price ?? 1) * 100);
    const averageCatalogueMargin = marginValues.length ? marginValues.reduce((sum, value) => sum + value, 0) / marginValues.length : 0;
    const lowMarginItems = marginValues.filter((value) => value < 20).length;
    return {
      customers: store.customers?.length ?? 0,
      products: store.products?.length ?? 0,
      sales30,
      sales90,
      pipeline,
      lowStock: (store.products ?? []).filter((product) => Number(product.qty ?? 0) <= Number(product.reorder ?? 0)).length,
      activeJobs: (store.jobs ?? []).filter((job) => !["complete", "cancelled"].includes(job.status ?? "")).length,
      openTasks: (store.tasks ?? []).filter((task) => !task.done).length,
      averageCatalogueMargin: Number(averageCatalogueMargin.toFixed(1)),
      lowMarginItems,
    };
  } catch {
    return { customers: 0, products: 0, sales30: 0, sales90: 0, pipeline: 0, lowStock: 0, activeJobs: 0, openTasks: 0, averageCatalogueMargin: 0, lowMarginItems: 0 };
  }
}

export function buildGrowthAnalysis(saved: SavedReport, plan: GrowthPlan, operating: OperatingSnapshot) {
  const currentAnnualRevenue = saved.data.monthlyRevenue * 12;
  const targetAnnualRevenue = Math.max(plan.annualRevenueTarget, currentAnnualRevenue);
  const revenueGap = Math.max(0, targetAnnualRevenue - currentAnnualRevenue);
  const monthlyRevenueGap = revenueGap / 12;
  const currentMargin = saved.report.metrics.operatingMargin;
  const targetMargin = Math.max(plan.targetOperatingMargin, currentMargin);
  const targetMonthlyProfit = targetAnnualRevenue / 12 * targetMargin / 100;
  const currentMonthlyProfit = saved.report.metrics.monthlyOperatingResult;
  const profitGap = Math.max(0, targetMonthlyProfit - currentMonthlyProfit);
  const initiativeExpectedRevenue = plan.initiatives.filter((item) => !["stop", "complete"].includes(item.status)).reduce((sum, item) => sum + item.expectedMonthlyRevenue, 0);
  const initiativeExpectedProfit = plan.initiatives.filter((item) => !["stop", "complete"].includes(item.status)).reduce((sum, item) => sum + item.expectedMonthlyGrossProfit, 0);
  const initiativeActualRevenue = plan.initiatives.reduce((sum, item) => sum + item.actualMonthlyRevenue, 0);
  const runway = saved.report.metrics.runwayMonths;
  const constraints: string[] = [];
  if (saved.report.metrics.overallScore < 70) constraints.push("Business pressure is still elevated; protect recovery gains before aggressive expansion.");
  if (currentMargin < 10) constraints.push("Operating margin is thin. Margin repair may create more value than adding low-margin revenue.");
  if (saved.data.overdueInvoices > saved.data.monthlyRevenue * .5) constraints.push("Receivables are high relative to monthly revenue. Collection discipline is a growth constraint.");
  if (runway !== null && runway < 2) constraints.push("Cash runway is below two months. Growth spending should be staged and reversible.");
  if (operating.lowStock > 0) constraints.push("Current stock exceptions may constrain additional sales.");
  if (operating.openTasks > 20) constraints.push("The operating workload is already high; capacity should be tested before adding demand.");
  if ((plan.capacityUtilisationPercent ?? 0) >= 85) constraints.push("Declared capacity utilisation is at least 85%; additional demand may require process, equipment or staffing capacity.");
  if ((plan.ownerHoursPerWeek ?? 0) >= 50) constraints.push("Owner workload is already high; owner dependence is a growth constraint.");
  if ((plan.largestCustomerPercent ?? 0) >= 30) constraints.push("Customer concentration is high; growth should diversify rather than deepen a single-customer dependency.");
  if ((operating.lowMarginItems ?? 0) > 0) constraints.push(`${operating.lowMarginItems} catalogue item(s) show less than 20% gross margin from recorded price/cost data.`);
  if (!constraints.length) constraints.push("No major growth blocker is visible from current MRI and operating data. Validate capacity before scaling.");

  const opportunities: string[] = [];
  if (saved.data.accountsReceivable > 0) opportunities.push("Convert receivables to cash faster before funding new growth externally.");
  if (currentMargin > 0 && currentMargin < targetMargin) opportunities.push("Test pricing and product/customer mix before pursuing pure volume growth.");
  if (operating.pipeline > 0) opportunities.push("Work the existing quote pipeline before increasing acquisition spend.");
  if (operating.customers > 0) opportunities.push("Segment current customers by value, margin and repeat potential.");
  if ((plan.recurringRevenuePercent ?? 0) < 25) opportunities.push("Test an appropriate recurring, contracted or repeat-purchase offer to improve revenue predictability.");
  if ((plan.repeatCustomerPercent ?? 0) < 30 && operating.customers > 0) opportunities.push("Build a retention/reactivation experiment before relying only on new-customer acquisition.");
  if ((operating.averageCatalogueMargin ?? 0) > 0) opportunities.push(`Recorded catalogue gross margin averages about ${operating.averageCatalogueMargin}%; use product/service mix to prioritise contribution.`);
  if (plan.initiatives.length === 0) opportunities.push("Create one low-cost, measurable growth experiment with a review date.");

  const activeInitiativeCost = plan.initiatives.filter((item) => !["stop", "complete"].includes(item.status)).reduce((sum, item) => sum + item.cost, 0);
  const monthlyGrowthBudget = Math.max(0, plan.monthlyGrowthBudget ?? 0);
  const capitalRequired = activeInitiativeCost + monthlyGrowthBudget * 3;
  const fundingReadiness = saved.report.metrics.overallScore >= 70 && (runway === null || runway >= 2) && saved.data.overdueTax === 0
    ? "strong"
    : saved.report.metrics.overallScore >= 55 && saved.data.overdueTax === 0
      ? "caution"
      : "repair-first";

  return {
    currentAnnualRevenue,
    targetAnnualRevenue,
    revenueGap,
    monthlyRevenueGap,
    currentMargin,
    targetMargin,
    targetMonthlyProfit,
    currentMonthlyProfit,
    profitGap,
    initiativeExpectedRevenue,
    initiativeExpectedProfit,
    initiativeActualRevenue,
    constraints,
    opportunities,
    targetCoveragePercent: monthlyRevenueGap <= 0 ? 100 : Math.min(100, Math.round(initiativeExpectedRevenue / monthlyRevenueGap * 100)),
    capitalRequired,
    fundingReadiness,
    averageCatalogueMargin: operating.averageCatalogueMargin ?? 0,
    lowMarginItems: operating.lowMarginItems ?? 0,
    recurringRevenuePercent: plan.recurringRevenuePercent ?? 0,
    repeatCustomerPercent: plan.repeatCustomerPercent ?? 0,
    capacityUtilisationPercent: plan.capacityUtilisationPercent ?? 0,
  };
}

export function growthScenario(saved: SavedReport, input: { priceChangePercent: number; volumeChangePercent: number; addedMonthlyFixedCost: number; addedMonthlyPayroll: number; addedMonthlyMarketing: number }) {
  const baseRevenue = saved.data.monthlyRevenue;
  const priceFactor = 1 + input.priceChangePercent / 100;
  const volumeFactor = 1 + input.volumeChangePercent / 100;
  const projectedRevenue = Math.max(0, baseRevenue * priceFactor * volumeFactor);
  const variableRate = baseRevenue > 0 ? saved.data.variableExpenses / baseRevenue : 0;
  const projectedVariable = projectedRevenue * variableRate;
  const projectedResult = projectedRevenue - projectedVariable - saved.data.fixedExpenses - saved.data.ownerDrawings - saved.data.loanRepayments - input.addedMonthlyFixedCost - input.addedMonthlyPayroll - input.addedMonthlyMarketing;
  const incrementalResult = projectedResult - saved.report.metrics.monthlyOperatingResult;
  const newSpend = input.addedMonthlyFixedCost + input.addedMonthlyPayroll + input.addedMonthlyMarketing;
  const breakEvenExtraRevenue = newSpend > 0 ? newSpend / Math.max(.01, 1 - variableRate) : 0;
  return { projectedRevenue, projectedResult, incrementalResult, breakEvenExtraRevenue };
}
