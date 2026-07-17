export type RevenueTrend = "growing" | "stable" | "declining" | "volatile";

export type BusinessData = {
  businessName: string;
  industry: string;
  country: string;
  yearsOperating: number;
  employees: number;
  monthlyRevenue: number;
  fixedExpenses: number;
  variableExpenses: number;
  ownerDrawings: number;
  loanRepayments: number;
  cashAvailable: number;
  accountsReceivable: number;
  overdueInvoices: number;
  totalDebt: number;
  overdueTax: number;
  overdueSuppliers: number;
  revenueTrend: RevenueTrend;
  biggestProblem: string;
  immediateGoal: string;
  urgentConcerns: string[];
};

export type HealthMetrics = {
  monthlyOperatingResult: number;
  operatingMargin: number;
  expenseRatio: number;
  runwayMonths: number | null;
  debtPressure: number;
  receivablesPressure: number;
  revenueStability: number;
  cashFlowScore: number;
  runwayScore: number;
  debtScore: number;
  revenueScore: number;
  overallScore: number;
};

export type PlanAction = {
  title: string;
  urgency: "Critical" | "High" | "Medium";
  impact: "High" | "Medium";
  difficulty: "Easy" | "Moderate" | "Hard";
  reason: string;
};

export type BusinessReport = {
  metrics: HealthMetrics;
  warnings: string[];
  strengths: string[];
  risks: string[];
  urgentHelp: boolean;
  today: PlanAction[];
  sevenDays: PlanAction[];
  thirtyDays: PlanAction[];
  ninetyDays: PlanAction[];
};
