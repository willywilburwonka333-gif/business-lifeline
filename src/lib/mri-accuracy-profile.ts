export type BusinessStructure = "sole-trader" | "company" | "partnership" | "trust" | "other" | "unknown";
export type GstBasis = "inclusive" | "exclusive" | "not-registered" | "unknown";
export type Seasonality = "low" | "moderate" | "high" | "unknown";

export type MriAccuracyProfile = {
  businessStructure: BusinessStructure;
  gstBasis: GstBasis;
  monthlyWages: number;
  monthlySuper: number;
  paygOutstanding: number;
  accountsPayable: number;
  nextThirtyDayCreditors: number;
  overdraftLimit: number;
  availableFacilities: number;
  securedDebt: number;
  unsecuredDebt: number;
  personalGuarantees: boolean | null;
  seasonality: Seasonality;
  largestCustomerPercent: number;
  ownerLoansToBusiness: number;
  ownerLoansFromBusiness: number;
  oneOffIncome: number;
  oneOffExpenses: number;
};

export const emptyMriAccuracyProfile = (): MriAccuracyProfile => ({
  businessStructure: "unknown",
  gstBasis: "unknown",
  monthlyWages: 0,
  monthlySuper: 0,
  paygOutstanding: 0,
  accountsPayable: 0,
  nextThirtyDayCreditors: 0,
  overdraftLimit: 0,
  availableFacilities: 0,
  securedDebt: 0,
  unsecuredDebt: 0,
  personalGuarantees: null,
  seasonality: "unknown",
  largestCustomerPercent: 0,
  ownerLoansToBusiness: 0,
  ownerLoansFromBusiness: 0,
  oneOffIncome: 0,
  oneOffExpenses: 0,
});

export function assessMriAccuracyProfile(profile: MriAccuracyProfile) {
  const completed = [
    profile.businessStructure !== "unknown",
    profile.gstBasis !== "unknown",
    profile.seasonality !== "unknown",
    profile.personalGuarantees !== null,
    profile.monthlyWages >= 0,
    profile.monthlySuper >= 0,
    profile.accountsPayable >= 0,
    profile.nextThirtyDayCreditors >= 0,
    profile.securedDebt >= 0,
    profile.unsecuredDebt >= 0,
    profile.largestCustomerPercent >= 0,
  ];
  const confidence = Math.round((completed.filter(Boolean).length / completed.length) * 100);
  const risks: string[] = [];
  if (profile.paygOutstanding > 0) risks.push("PAYG obligations are outstanding.");
  if (profile.nextThirtyDayCreditors > profile.availableFacilities + profile.overdraftLimit) risks.push("Known 30-day creditor commitments exceed declared facilities before trading receipts.");
  if (profile.personalGuarantees) risks.push("Personal guarantees may increase the owner’s personal exposure.");
  if (profile.largestCustomerPercent >= 40) risks.push("A single customer represents at least 40% of revenue.");
  if (profile.seasonality === "high") risks.push("High seasonality means average monthly figures may hide short-term cash pressure.");
  if (profile.oneOffExpenses > profile.oneOffIncome) risks.push("Known one-off expenses exceed known one-off income.");
  return { confidence, risks };
}
