export type RevenueTrend = "growing" | "stable" | "declining" | "volatile";

export type BusinessData = {
  businessName: string;
  industry: string;
  country: string;
  yearsOperating: number;
  employees: number;
  monthlyRevenue: number;
  /** Optional actual cash collected in the same month, not invoiced sales. */
  monthlyCashReceipts?: number | null;
  /** Optional total cash paid in that month (including tax, debt and drawings paid). */
  monthlyCashPayments?: number | null;
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
  pressureFactors?: string[];
};

export type PressureLevel = "Stable" | "Watch" | "High" | "Severe" | "Critical";

export type HealthMetrics = {
  /** Actual owner-reported cash data, or a provisional revenue-based proxy. */
  cashFlowBasis: "cash-receipts-payments" | "revenue-proxy";
  /** Revenue less stated operating expenses (not audited accounting profit). */
  operatingSurplusEstimate: number;
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
  liquidityScore: number;
  obligationsScore: number;
  dataConfidence: number;
  overallScore: number;
  pressureLevel: PressureLevel;
  criticalTriggers: string[];
  scoreExplanation: string[];
};

export type PlanAction = {
  title: string;
  urgency: "Critical" | "High" | "Medium";
  impact: "High" | "Medium";
  difficulty: "Easy" | "Moderate" | "Hard";
  reason: string;
};

export type AiPriority = {
  title: string;
  why: string;
  timeframe: "Today" | "7 days" | "30 days" | "90 days";
  expectedImpact: string;
  caution: string;
};

export type AiAnalysis = {
  diagnosis: string;
  rootCauses: string[];
  priorities: AiPriority[];
  questions: string[];
  professionalHelp: {
    recommended: boolean;
    reason: string;
    professionalType: string;
  };
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
  industryRecommendations: string[];
  aiAnalysis?: AiAnalysis;
  aiStatus?: "ready" | "fallback";
};
