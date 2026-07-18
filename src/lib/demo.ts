import type { BusinessData } from "./types";

export const emptyBusiness: BusinessData = {
  businessName: "", industry: "", country: "", yearsOperating: 0, employees: 0,
  monthlyRevenue: 0, fixedExpenses: 0, variableExpenses: 0, ownerDrawings: 0,
  loanRepayments: 0, cashAvailable: 0, accountsReceivable: 0, overdueInvoices: 0,
  totalDebt: 0, overdueTax: 0, overdueSuppliers: 0, revenueTrend: "stable",
  biggestProblem: "", immediateGoal: "", urgentConcerns: [], pressureFactors: [],
};

export const demoBusiness: BusinessData = {
  businessName: "Riverbend Café", industry: "Café and hospitality", country: "Australia",
  yearsOperating: 6, employees: 9, monthlyRevenue: 32000, fixedExpenses: 19000,
  variableExpenses: 10500, ownerDrawings: 3000, loanRepayments: 1000,
  cashAvailable: 14000, accountsReceivable: 9500, overdueInvoices: 8500,
  totalDebt: 42000, overdueTax: 11000, overdueSuppliers: 7000, revenueTrend: "declining",
  biggestProblem: "Sales are falling while costs and overdue bills keep rising.",
  immediateGoal: "Stabilise cash flow and keep the café trading.", urgentConcerns: ["tax", "debts"],
  pressureFactors: ["demand", "costs", "staffing", "margins"],
};