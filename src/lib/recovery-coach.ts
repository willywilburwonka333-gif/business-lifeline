import type { BusinessReport } from "./types";

export const RECOVERY_COACH_KEY = "business-lifeline-recovery-coach-v1";

export type CoachCheckIn = {
  startedAt: string;
  updatedAt: string;
  contactedTaxAuthority: boolean;
  contactedCustomers: boolean;
  contactedSuppliers: boolean;
  frozeSpending: boolean;
  soughtProfessionalHelp: boolean;
  invoicesCollected: number;
  obligationsPaid: number;
  monthlySavingsFound: number;
  notes: string;
};

export const emptyCoachCheckIn = (): CoachCheckIn => ({
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  contactedTaxAuthority: false,
  contactedCustomers: false,
  contactedSuppliers: false,
  frozeSpending: false,
  soughtProfessionalHelp: false,
  invoicesCollected: 0,
  obligationsPaid: 0,
  monthlySavingsFound: 0,
  notes: "",
});

export function parseCoachCheckIn(raw: string | null): CoachCheckIn | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CoachCheckIn>;
    const numbers = [value.invoicesCollected, value.obligationsPaid, value.monthlySavingsFound];
    if (typeof value.startedAt !== "string" || typeof value.updatedAt !== "string") return null;
    if (numbers.some((item) => typeof item !== "number" || !Number.isFinite(item) || item < 0)) return null;
    return {
      startedAt: value.startedAt,
      updatedAt: value.updatedAt,
      contactedTaxAuthority: Boolean(value.contactedTaxAuthority),
      contactedCustomers: Boolean(value.contactedCustomers),
      contactedSuppliers: Boolean(value.contactedSuppliers),
      frozeSpending: Boolean(value.frozeSpending),
      soughtProfessionalHelp: Boolean(value.soughtProfessionalHelp),
      invoicesCollected: value.invoicesCollected ?? 0,
      obligationsPaid: value.obligationsPaid ?? 0,
      monthlySavingsFound: value.monthlySavingsFound ?? 0,
      notes: typeof value.notes === "string" ? value.notes : "",
    };
  } catch {
    return null;
  }
}

export function readCoachCheckIn(storage: Storage = window.localStorage): CoachCheckIn {
  const raw = storage.getItem(RECOVERY_COACH_KEY);
  const parsed = parseCoachCheckIn(raw);
  if (raw && !parsed) storage.removeItem(RECOVERY_COACH_KEY);
  return parsed ?? emptyCoachCheckIn();
}

export function writeCoachCheckIn(value: CoachCheckIn, storage: Storage = window.localStorage) {
  storage.setItem(RECOVERY_COACH_KEY, JSON.stringify({ ...value, updatedAt: new Date().toISOString() }));
}

export function coachProgress(value: CoachCheckIn, report: BusinessReport) {
  const relevant = [
    report.today.some((item) => item.title.toLowerCase().includes("customer")) ? value.contactedCustomers : true,
    report.sevenDays.some((item) => item.title.toLowerCase().includes("tax")) ? value.contactedTaxAuthority : true,
    report.urgentHelp ? value.soughtProfessionalHelp : true,
    value.frozeSpending,
    value.contactedSuppliers || report.metrics.overallScore >= 70,
  ];
  return Math.round((relevant.filter(Boolean).length / relevant.length) * 100);
}
