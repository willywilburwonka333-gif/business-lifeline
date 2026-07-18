import type { BusinessData, BusinessReport } from "./types";

export type PlaybookId =
  | "cashflow-crisis"
  | "sales-collapse"
  | "tax-debt"
  | "staff-pressure"
  | "rapid-growth"
  | "sale-preparation"
  | "succession"
  | "turnaround";

export type PlaybookStep = {
  timeframe: "Today" | "7 days" | "30 days" | "90 days";
  title: string;
  action: string;
  evidence: string;
  professional?: string;
};

export type RecoveryPlaybook = {
  id: PlaybookId;
  name: string;
  summary: string;
  reason: string;
  severity: "Immediate" | "High" | "Moderate" | "Strategic";
  successMeasures: string[];
  steps: PlaybookStep[];
};

const text = (data: BusinessData) => `${data.biggestProblem} ${data.immediateGoal} ${(data.pressureFactors ?? []).join(" ")}`.toLowerCase();

export function selectPlaybook(data: BusinessData, report: BusinessReport): RecoveryPlaybook {
  const combined = text(data);
  const monthlyLoss = report.metrics.monthlyOperatingResult < 0;
  const lowRunway = report.metrics.runwayMonths !== null && report.metrics.runwayMonths < 3;
  const taxPressure = data.overdueTax > 0 || data.urgentConcerns.includes("tax");
  const salesPressure = data.revenueTrend === "declining" || /sales|customers|revenue|leads|work drying/.test(combined);
  const staffPressure = /staff|employee|team|labour|worker|payroll/.test(combined) || data.urgentConcerns.includes("payroll");
  const growthPressure = data.revenueTrend === "growing" && /growth|scale|capacity|too much work|expansion/.test(combined);
  const saleIntent = /sell|sale|buyer|exit/.test(combined);
  const successionIntent = /succession|retire|family takeover|next generation|handover/.test(combined);

  if (taxPressure) return taxDebt(data, report);
  if (monthlyLoss || lowRunway || report.metrics.overallScore < 40) return cashflowCrisis(data, report);
  if (salesPressure) return salesCollapse(data, report);
  if (staffPressure) return staffPressurePlaybook(data, report);
  if (growthPressure) return rapidGrowth(data, report);
  if (saleIntent) return salePreparation(data, report);
  if (successionIntent) return succession(data, report);
  return turnaround(data, report);
}

function cashflowCrisis(data: BusinessData, report: BusinessReport): RecoveryPlaybook {
  return {
    id: "cashflow-crisis",
    name: "Cashflow Crisis",
    summary: "Protect cash immediately, stop avoidable leakage, collect money owed and stabilise weekly commitments.",
    reason: `Selected because the MRI shows a ${report.metrics.monthlyOperatingResult < 0 ? "monthly operating loss" : "short cash runway"} and a health score of ${report.metrics.overallScore}/100.`,
    severity: report.urgentHelp || report.metrics.overallScore < 30 ? "Immediate" : "High",
    successMeasures: ["Weekly cash position stops declining", "Overdue invoices reduce", "Monthly operating result improves", "Critical payments are scheduled"],
    steps: [
      { timeframe: "Today", title: "Build a 13-week cash list", action: "List every expected receipt and payment by week. Mark payroll, tax, rent, secured debt and essential suppliers separately.", evidence: `Current cash: ${data.cashAvailable}. Monthly result: ${report.metrics.monthlyOperatingResult}.`, professional: "Accountant or turnaround adviser" },
      { timeframe: "Today", title: "Freeze non-essential spending", action: "Pause discretionary subscriptions, purchases, drawings and projects until the weekly cash position is visible.", evidence: `Fixed and variable expenses total ${data.fixedExpenses + data.variableExpenses} per month.` },
      { timeframe: "7 days", title: "Collect overdue invoices", action: "Contact every overdue customer, confirm disputes and agree exact payment dates. Escalate large or old debts lawfully.", evidence: `${data.overdueInvoices} is overdue.` },
      { timeframe: "7 days", title: "Negotiate before missing payments", action: "Contact the tax authority, lenders and key suppliers before commitments are missed. Document every arrangement.", evidence: `${data.overdueTax + data.overdueSuppliers} is overdue to tax and suppliers.`, professional: "Registered tax agent, lender hardship team or insolvency professional" },
      { timeframe: "30 days", title: "Repair the monthly result", action: "Use the simulator to combine price, sales, cost, drawings and repayment changes until the business reaches a credible positive monthly result.", evidence: "A one-off cash injection will not repair an underlying operating loss." },
      { timeframe: "90 days", title: "Rebuild reserves", action: "Set a minimum cash reserve target and rerun the MRI monthly until runway and health score are consistently improving.", evidence: "Recovery is sustained only when cash generation improves, not just when debts are deferred." },
    ],
  };
}

function salesCollapse(data: BusinessData, report: BusinessReport): RecoveryPlaybook {
  return {
    id: "sales-collapse", name: "Sales Collapse", severity: report.metrics.overallScore < 50 ? "High" : "Moderate",
    summary: "Identify where demand, conversion or customer retention broke, then rebuild revenue without destroying margin.",
    reason: `Selected because revenue is ${data.revenueTrend} and the stated pressure points to sales or customer demand.`,
    successMeasures: ["Qualified leads increase", "Quote conversion improves", "Repeat sales improve", "Revenue rises without margin erosion"],
    steps: [
      { timeframe: "Today", title: "Separate pipeline from revenue", action: "Count enquiries, qualified leads, quotes, wins, repeat customers and average sale for the last 8–12 weeks.", evidence: `Monthly revenue is ${data.monthlyRevenue}; trend is ${data.revenueTrend}.` },
      { timeframe: "7 days", title: "Call lost and inactive customers", action: "Ask why they did not buy or stopped buying. Record price, timing, service, trust and competitor reasons.", evidence: "Direct customer evidence is more reliable than guessing." },
      { timeframe: "7 days", title: "Fix the weakest conversion stage", action: "Improve the single stage losing the most value: response time, qualification, quote follow-up, offer clarity or retention.", evidence: `Operating margin is ${report.metrics.operatingMargin}%, so discounting must be tested before use.` },
      { timeframe: "30 days", title: "Build a repeatable weekly sales rhythm", action: "Set targets for outreach, follow-ups, quotes, wins and retained customers, then review them weekly.", evidence: "Activity must be connected to conversion and profitable revenue." },
      { timeframe: "90 days", title: "Reduce customer concentration", action: "Develop at least two reliable acquisition channels and monitor reliance on major customers.", evidence: "Diversification reduces the damage from one channel or customer failing." },
    ],
  };
}

function taxDebt(data: BusinessData, report: BusinessReport): RecoveryPlaybook {
  return {
    id: "tax-debt", name: "Tax Debt", severity: data.overdueTax > data.cashAvailable ? "Immediate" : "High",
    summary: "Stop tax debt worsening, establish the true liability and negotiate from a current, documented position.",
    reason: `Selected because overdue tax is ${data.overdueTax} and tax pressure is marked as urgent.`,
    successMeasures: ["All lodgements are current", "Debt amount is reconciled", "Payment arrangement is documented", "New tax obligations are quarantined"],
    steps: [
      { timeframe: "Today", title: "Confirm every outstanding lodgement", action: "Identify missing BAS, returns, payroll or super obligations and the due date of each item.", evidence: `Overdue tax entered: ${data.overdueTax}.`, professional: "Registered tax agent" },
      { timeframe: "Today", title: "Quarantine new tax money", action: "Separate current tax collections from operating cash so the old debt does not keep growing.", evidence: "A payment plan fails if new liabilities continue accumulating." },
      { timeframe: "7 days", title: "Reconcile the debt", action: "Match tax authority statements to accounting records, penalties, interest and lodged amounts before negotiating.", evidence: "Only verified figures should be used in negotiations.", professional: "Registered tax agent or accountant" },
      { timeframe: "7 days", title: "Propose a sustainable arrangement", action: "Use a 13-week cash forecast to propose payments the business can actually maintain.", evidence: `Monthly operating result is ${report.metrics.monthlyOperatingResult}.`, professional: "Tax agent; insolvency professional where solvency is uncertain" },
      { timeframe: "30 days", title: "Install tax controls", action: "Automate tax allocations, due-date reminders and weekly reconciliation.", evidence: "The objective is to prevent recurrence, not only clear the old balance." },
    ],
  };
}

function staffPressurePlaybook(data: BusinessData, report: BusinessReport): RecoveryPlaybook {
  return {
    id: "staff-pressure", name: "Staff Pressure", severity: data.urgentConcerns.includes("payroll") ? "High" : "Moderate",
    summary: "Protect payroll compliance, match labour capacity to profitable work and remove avoidable owner dependency.",
    reason: `Selected because the MRI identifies staff, payroll or labour pressure across ${data.employees} employees.`,
    successMeasures: ["Payroll obligations are current", "Labour cost is measured against output", "Critical roles have coverage", "Owner bottlenecks reduce"],
    steps: [
      { timeframe: "Today", title: "Protect payroll obligations", action: "Confirm wages, tax, super and leave obligations due in the next four weeks.", evidence: "Employment obligations require prompt professional advice when payment is uncertain.", professional: "Accountant and employment adviser" },
      { timeframe: "7 days", title: "Measure labour by role", action: "Compare hours and total employment cost with revenue, gross margin or output generated by each role.", evidence: `${data.employees} employees support ${data.monthlyRevenue} monthly revenue.` },
      { timeframe: "7 days", title: "Find the constraint", action: "Identify whether the real problem is insufficient work, poor scheduling, weak training, rework or one overloaded person.", evidence: "Headcount alone does not reveal the operational problem." },
      { timeframe: "30 days", title: "Redesign work before cutting", action: "Improve rosters, responsibilities, processes and performance expectations before making structural employment decisions.", evidence: "Employment changes carry legal, financial and cultural consequences.", professional: "Employment lawyer or HR adviser" },
      { timeframe: "90 days", title: "Build role resilience", action: "Document critical processes and cross-train essential responsibilities.", evidence: "The business should not fail because one person is absent." },
    ],
  };
}

function rapidGrowth(data: BusinessData, report: BusinessReport): RecoveryPlaybook {
  return {
    id: "rapid-growth", name: "Rapid Growth", severity: "Strategic",
    summary: "Prevent profitable-looking growth from consuming cash, service quality and owner capacity.",
    reason: `Selected because revenue is growing and the stated pressure relates to scale or capacity.`,
    successMeasures: ["Growth is cash-funded or financed deliberately", "Gross margin is protected", "Delivery capacity matches sales", "Working capital is forecast"],
    steps: [
      { timeframe: "Today", title: "Calculate cash needed per new sale", action: "Estimate deposits, materials, labour and payment delay for additional work before accepting more volume.", evidence: `Receivables total ${data.accountsReceivable}; cash available is ${data.cashAvailable}.` },
      { timeframe: "7 days", title: "Protect pricing and deposits", action: "Review deposits, progress payments, minimum margin and change-order controls.", evidence: `Operating margin is ${report.metrics.operatingMargin}%.` },
      { timeframe: "30 days", title: "Capacity-plan the bottleneck", action: "Forecast sales against labour, equipment, supplier and management capacity.", evidence: "Growth should be constrained by the weakest delivery resource." },
      { timeframe: "90 days", title: "Fund working capital deliberately", action: "Compare retained cash, deposits, supplier terms and appropriate finance before expansion.", evidence: "Revenue growth can worsen cashflow when costs are paid before customers pay.", professional: "Accountant or commercial finance adviser" },
    ],
  };
}

function salePreparation(data: BusinessData, report: BusinessReport): RecoveryPlaybook {
  return {
    id: "sale-preparation", name: "Business Sale Preparation", severity: "Strategic",
    summary: "Make earnings, records, operations and owner independence credible to a buyer.",
    reason: "Selected because the stated goal or problem indicates a business sale or exit.",
    successMeasures: ["Financial records are normalised", "Owner dependence falls", "Contracts and IP are documented", "Buyer risks are disclosed and controlled"],
    steps: [
      { timeframe: "Today", title: "Define the sale objective", action: "Clarify desired timing, owner role after sale, minimum acceptable outcome and non-negotiables.", evidence: `Current health score is ${report.metrics.overallScore}/100.` },
      { timeframe: "7 days", title: "Clean the numbers", action: "Reconcile accounts and separate genuine business expenses from discretionary owner items.", evidence: "Buyers value maintainable earnings, not unexplained adjustments.", professional: "Accountant" },
      { timeframe: "30 days", title: "Document the business", action: "Create process, customer, supplier, employee, asset, licence, contract and IP registers.", evidence: "Undocumented value is difficult for a buyer to rely on." },
      { timeframe: "90 days", title: "Reduce owner dependence", action: "Transfer routine decisions, relationships and delivery knowledge into systems and accountable roles.", evidence: "A buyer discounts a business that cannot operate without the owner." },
    ],
  };
}

function succession(data: BusinessData, report: BusinessReport): RecoveryPlaybook {
  return {
    id: "succession", name: "Succession Planning", severity: "Strategic",
    summary: "Transfer leadership and ownership without damaging family relationships, continuity or business value.",
    reason: "Selected because the stated objective indicates retirement, family succession or leadership handover.",
    successMeasures: ["Successor readiness is assessed", "Decision rights are documented", "Ownership and management plans are separated", "Contingency plans exist"],
    steps: [
      { timeframe: "Today", title: "Separate ownership from management", action: "Define who may own the business, who can run it and what capability each role requires.", evidence: "Family relationship alone does not establish role readiness." },
      { timeframe: "7 days", title: "Assess successor readiness", action: "Score technical, financial, leadership and relationship capability against the future role.", evidence: `The business has operated for ${data.yearsOperating} years.` },
      { timeframe: "30 days", title: "Document decision rights", action: "Set responsibilities, authority limits, reporting and dispute processes for the transition.", evidence: "Ambiguous authority creates operational and family conflict." },
      { timeframe: "90 days", title: "Build legal and financial transition plans", action: "Coordinate valuation, tax, estate, funding, insurance and ownership documentation.", evidence: "Succession has legal and tax consequences requiring tailored advice.", professional: "Lawyer, accountant and succession adviser" },
    ],
  };
}

function turnaround(data: BusinessData, report: BusinessReport): RecoveryPlaybook {
  return {
    id: "turnaround", name: "90-Day Turnaround", severity: report.metrics.overallScore < 60 ? "High" : "Moderate",
    summary: "Focus the business on the few operating, cash and customer changes most likely to improve health in 90 days.",
    reason: `Selected as the best general pathway for a health score of ${report.metrics.overallScore}/100 and the stated goal: ${data.immediateGoal}.`,
    successMeasures: ["Top three actions are completed", "Monthly result improves", "Health score rises", "Owner reviews progress weekly"],
    steps: [
      { timeframe: "Today", title: "Choose the three highest-impact actions", action: "Use the MRI Action Centre and commit an owner, due date and measurable outcome to each action.", evidence: `${report.today.length + report.sevenDays.length} immediate and seven-day actions are available.` },
      { timeframe: "7 days", title: "Establish a weekly scorecard", action: "Track cash, sales, overdue invoices, margin, obligations and completed recovery actions.", evidence: "Weekly visibility prevents late discovery of deteriorating conditions." },
      { timeframe: "30 days", title: "Remove the main operating constraint", action: `Target the issue described as: ${data.biggestProblem}.`, evidence: "The turnaround should address root causes rather than symptoms." },
      { timeframe: "90 days", title: "Rerun the MRI and reset priorities", action: "Compare the new health score and recovery timeline, then keep, replace or escalate actions based on evidence.", evidence: "A turnaround plan must adapt to measured results." },
    ],
  };
}
