import type { BusinessData } from "./types";

export const emptyBusiness: BusinessData = {
  businessName: "", industry: "", country: "", yearsOperating: 0, employees: 0,
  monthlyRevenue: 0, fixedExpenses: 0, variableExpenses: 0, ownerDrawings: 0,
  loanRepayments: 0, cashAvailable: 0, accountsReceivable: 0, overdueInvoices: 0,
  totalDebt: 0, overdueTax: 0, overdueSuppliers: 0, revenueTrend: "stable",
  biggestProblem: "", immediateGoal: "", urgentConcerns: [], pressureFactors: [],
};

export const distressedDemoBusiness: BusinessData = {
  businessName: "Family Table Cafe", industry: "Cafe and hospitality", country: "Australia", yearsOperating: 11, employees: 7,
  monthlyRevenue: 62000, fixedExpenses: 29000, variableExpenses: 27000, ownerDrawings: 6500, loanRepayments: 4200, cashAvailable: 8500,
  accountsReceivable: 3000, overdueInvoices: 1200, totalDebt: 138000, overdueTax: 31000, overdueSuppliers: 18500, revenueTrend: "declining",
  biggestProblem: "Cash is running out and tax and suppliers are overdue.", immediateGoal: "Survive the next 13 weeks and stabilise cash flow.",
  urgentConcerns: ["tax", "debts"], pressureFactors: ["demand", "costs", "margins"],
};
export const mediumDemoBusiness: BusinessData = {
  businessName: "Metro Projects Group", industry: "Construction trades", country: "Australia", yearsOperating: 12, employees: 38,
  monthlyRevenue: 720000, fixedExpenses: 210000, variableExpenses: 330000, ownerDrawings: 18000, loanRepayments: 32000, cashAvailable: 410000,
  accountsReceivable: 560000, overdueInvoices: 95000, totalDebt: 680000, overdueTax: 0, overdueSuppliers: 45000, revenueTrend: "stable",
  biggestProblem: "Working capital is tied up across projects, receivables and supplier commitments.", immediateGoal: "Improve cash conversion and grow without creating a funding squeeze.",
  urgentConcerns: [], pressureFactors: ["operations", "staffing", "costs"],
};
export const largeDemoBusiness: BusinessData = {
  businessName: "Southern National Services", industry: "Professional services", country: "Australia", yearsOperating: 22, employees: 240,
  monthlyRevenue: 6800000, fixedExpenses: 1900000, variableExpenses: 2500000, ownerDrawings: 0, loanRepayments: 180000, cashAvailable: 7400000,
  accountsReceivable: 5100000, overdueInvoices: 240000, totalDebt: 6200000, overdueTax: 0, overdueSuppliers: 0, revenueTrend: "growing",
  biggestProblem: "Scale efficiently while protecting margin, capacity and cash discipline.", immediateGoal: "Grow profitably and strengthen management systems for the next stage.",
  urgentConcerns: [], pressureFactors: ["operations"],
};
export const demoBusinesses = [distressedDemoBusiness, mediumDemoBusiness, largeDemoBusiness] as const;
export const demoBusiness: BusinessData = distressedDemoBusiness;
export const riverbendLegacyDemo: BusinessData = {
  businessName: "Riverbend Café", industry: "Café and hospitality", country: "Australia",
  yearsOperating: 6, employees: 9, monthlyRevenue: 32000, fixedExpenses: 19000,
  variableExpenses: 10500, ownerDrawings: 3000, loanRepayments: 1000,
  cashAvailable: 14000, accountsReceivable: 9500, overdueInvoices: 8500,
  totalDebt: 42000, overdueTax: 11000, overdueSuppliers: 7000, revenueTrend: "declining",
  biggestProblem: "Sales are falling while costs and overdue bills keep rising.",
  immediateGoal: "Stabilise cash flow and keep the café trading.", urgentConcerns: ["tax", "debts"],
  pressureFactors: ["demand", "costs", "staffing", "margins"],
};