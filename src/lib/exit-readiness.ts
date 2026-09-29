import type { SavedReport } from "./saved-report";

export const EXIT_PLAN_KEY = "business-lifeline-exit-plan-v1";

export type ExitPath = "undecided" | "third-party-sale" | "management-buyout" | "family-succession" | "partner-buyout" | "orderly-closure";
export type ReadinessKey =
  | "financials" | "ownerDependence" | "customerConcentration" | "supplierDependence"
  | "staffDepth" | "contracts" | "ipBrand" | "systems" | "compliance" | "disputes"
  | "management" | "workingCapital" | "dataRoom";

export type ExitPlan = {
  path: ExitPath;
  targetDate: string;
  desiredProceeds: number;
  maintainableAnnualEarnings: number;
  lowMultiple: number;
  highMultiple: number;
  ownerHoursPerWeek: number;
  ownerCriticalTasks: string;
  recurringRevenuePercent: number;
  largestCustomerPercent: number;
  notes: string;
  readiness: Record<ReadinessKey, 0 | 1 | 2>;
  dataRoom: Record<string, boolean>;
};

export const readinessLabels: Record<ReadinessKey, string> = {
  financials: "Clean, explainable financials",
  ownerDependence: "Business can operate without the owner",
  customerConcentration: "Customer concentration is controlled",
  supplierDependence: "Supplier concentration is controlled",
  staffDepth: "Key roles have depth / backup",
  contracts: "Material contracts are documented",
  ipBrand: "IP, brand and domains are owned and documented",
  systems: "Core processes are documented",
  compliance: "Licences, tax and compliance are current",
  disputes: "Material disputes and liabilities are understood",
  management: "Management reporting is reliable",
  workingCapital: "Working capital is stable and explainable",
  dataRoom: "Buyer due-diligence records are organised",
};

export const dataRoomLabels: Record<string, string> = {
  financials3y: "3 years financial statements / management accounts",
  taxBas: "Tax returns, BAS and key tax records",
  bankDebt: "Loans, security interests and finance agreements",
  leases: "Property/equipment leases",
  customers: "Key customer contracts and revenue concentration",
  suppliers: "Key supplier contracts and terms",
  staff: "Staff structure, contracts and entitlements",
  licences: "Licences, registrations and insurance",
  ip: "Trade marks, domains, software/IP ownership",
  assets: "Plant, equipment and asset register",
  policies: "Policies, SOPs and documented operating systems",
  disputes: "Claims, disputes and material legal matters",
  pipeline: "Sales pipeline and forward work",
  handover: "Owner handover and transition plan",
};

const defaultReadiness = () => Object.fromEntries(Object.keys(readinessLabels).map((key) => [key, 0])) as ExitPlan["readiness"];
const defaultDataRoom = () => Object.fromEntries(Object.keys(dataRoomLabels).map((key) => [key, false])) as Record<string, boolean>;

export const emptyExitPlan = (): ExitPlan => ({
  path: "undecided",
  targetDate: "",
  desiredProceeds: 0,
  maintainableAnnualEarnings: 0,
  lowMultiple: 2,
  highMultiple: 4,
  ownerHoursPerWeek: 40,
  ownerCriticalTasks: "",
  recurringRevenuePercent: 0,
  largestCustomerPercent: 0,
  notes: "",
  readiness: defaultReadiness(),
  dataRoom: defaultDataRoom(),
});

export function readExitPlan(storage: Storage = window.localStorage): ExitPlan {
  try {
    const raw = storage.getItem(EXIT_PLAN_KEY);
    if (!raw) return emptyExitPlan();
    const parsed = JSON.parse(raw) as Partial<ExitPlan>;
    return {
      ...emptyExitPlan(),
      ...parsed,
      readiness: { ...defaultReadiness(), ...(parsed.readiness ?? {}) },
      dataRoom: { ...defaultDataRoom(), ...(parsed.dataRoom ?? {}) },
    };
  } catch {
    return emptyExitPlan();
  }
}

export function buildExitAnalysis(saved: SavedReport, plan: ExitPlan) {
  const readinessValues = Object.values(plan.readiness);
  const readinessScore = Math.round(readinessValues.reduce((sum, value) => sum + value, 0) / Math.max(1, readinessValues.length * 2) * 100);
  const dataRoomValues = Object.values(plan.dataRoom);
  const dataRoomScore = Math.round(dataRoomValues.filter(Boolean).length / Math.max(1, dataRoomValues.length) * 100);
  const annualisedCurrentResult = Math.max(0, saved.report.metrics.monthlyOperatingResult * 12);
  const earnings = plan.maintainableAnnualEarnings > 0 ? plan.maintainableAnnualEarnings : annualisedCurrentResult;
  const lowIndicative = earnings * Math.max(0, plan.lowMultiple);
  const highIndicative = earnings * Math.max(plan.lowMultiple, plan.highMultiple);
  const risks: string[] = [];
  if (saved.report.metrics.overallScore < 70) risks.push("Current business pressure may reduce buyer confidence until recovery is demonstrated.");
  if (saved.data.overdueTax > 0 || saved.data.overdueSuppliers > 0) risks.push("Overdue obligations should be resolved or clearly documented before due diligence.");
  if (plan.ownerHoursPerWeek > 45) risks.push("High owner dependence can reduce transferability.");
  if (plan.largestCustomerPercent >= 30) risks.push("Customer concentration is a material buyer risk.");
  if (plan.recurringRevenuePercent < 20) risks.push("Low recurring/repeat revenue may make future earnings less predictable.");
  for (const [key, value] of Object.entries(plan.readiness) as Array<[ReadinessKey, 0 | 1 | 2]>) if (value === 0) risks.push(`${readinessLabels[key]} needs work.`);

  const priorities = (Object.entries(plan.readiness) as Array<[ReadinessKey, 0 | 1 | 2]>)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 5)
    .map(([key]) => readinessLabels[key]);

  return {
    readinessScore,
    dataRoomScore,
    earnings,
    lowIndicative,
    highIndicative,
    risks: risks.slice(0, 8),
    priorities,
    gapToDesired: plan.desiredProceeds > 0 ? Math.max(0, plan.desiredProceeds - highIndicative) : 0,
  };
}
