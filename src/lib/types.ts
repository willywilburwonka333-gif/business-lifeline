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
  pressureFactors?: string[];
};

export type PressureLevel = "Stable" | "Watch" | "High" | "Severe" | "Critical";

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
