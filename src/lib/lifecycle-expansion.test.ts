import { demoBusiness } from "./demo";
import { buildExitAnalysis, emptyExitPlan } from "./exit-readiness";
import { buildGrowthAnalysis, growthScenario, type GrowthPlan } from "./growth-engine";
import { generateReport } from "./planner";
import { validationMetrics } from "./professional-validation";
import { industryModule } from "./industry-intelligence";
import type { SavedReport } from "./saved-report";

const saved: SavedReport = { data: demoBusiness, report: generateReport(demoBusiness) };

const plan: GrowthPlan = {
  annualRevenueTarget: demoBusiness.monthlyRevenue * 12 * 1.2,
  targetOperatingMargin: 15,
  targetMonthlyOwnerIncome: 0,
  targetCashBufferMonths: 3,
  targetDate: "",
  strategy: "Grow profitably",
  initiatives: [{
    id: "g1", name: "Price test", hypothesis: "Customers accept a modest increase", cost: 0,
    expectedMonthlyRevenue: 5000, expectedMonthlyGrossProfit: 3500, actualMonthlyRevenue: 0,
    actualMonthlyGrossProfit: 0, owner: "Owner", reviewDate: "", status: "testing",
  }],
};

const operating = { customers: 10, products: 5, sales30: 10000, sales90: 30000, pipeline: 8000, lowStock: 0, activeJobs: 3, openTasks: 4 };
const growth = buildGrowthAnalysis(saved, plan, operating);
if (growth.targetAnnualRevenue < growth.currentAnnualRevenue) throw new Error("Growth target regression.");
if (growth.targetCoveragePercent <= 0) throw new Error("Growth experiment coverage missing.");

const scenario = growthScenario(saved, { priceChangePercent: 5, volumeChangePercent: 0, addedMonthlyFixedCost: 0, addedMonthlyPayroll: 0, addedMonthlyMarketing: 0 });
if (scenario.projectedRevenue <= demoBusiness.monthlyRevenue) throw new Error("Growth scenario calculation failed.");

const exitPlan = emptyExitPlan();
exitPlan.maintainableAnnualEarnings = 100000;
exitPlan.lowMultiple = 2;
exitPlan.highMultiple = 4;
exitPlan.readiness.financials = 2;
const exitAnalysis = buildExitAnalysis(saved, exitPlan);
if (exitAnalysis.lowIndicative !== 200000 || exitAnalysis.highIndicative !== 400000) throw new Error("Exit planning scenario calculation failed.");
if (exitAnalysis.readinessScore <= 0) throw new Error("Readiness scoring failed.");

const validation = validationMetrics([
  { id: "1", date: "", adviserRole: "Accountant", area: "Cash", lifelineFinding: "A", adviserFinding: "A", agreement: "agree", severityMatch: "same", notes: "" },
  { id: "2", date: "", adviserRole: "Accountant", area: "Debt", lifelineFinding: "B", adviserFinding: "C", agreement: "disagree", severityMatch: "adviser-higher", notes: "" },
]);
if (validation.reviewed !== 2 || validation.missedRiskSignals !== 1) throw new Error("Validation metrics failed.");


const hospitality = industryModule({ ...saved, data: { ...saved.data, industry: "Cafe and hospitality" } });
if (hospitality.id !== "hospitality" || hospitality.kpis.length < 4) throw new Error("Hospitality diagnostic module failed.");

const construction = industryModule({ ...saved, data: { ...saved.data, industry: "Construction trades" } });
if (construction.id !== "construction") throw new Error("Construction diagnostic module failed.");
