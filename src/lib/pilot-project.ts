import crypto from "node:crypto";
import type { DecodedIdToken } from "firebase-admin/auth";
import { requireFirebaseUser } from "./firebase-admin";
import { serviceByKey, type ServiceKey } from "./service-payments";

export type PilotPaymentMethod = "free" | "stripe" | "cash" | "payid" | "bank-transfer";
export type PilotStatus = "invited" | "active" | "completed" | "cancelled";
export type PilotPaymentStatus = "waived" | "pending" | "paid";
export type PilotReportSummary = {
  businessName: string;
  overallScore: number;
  dataConfidence: number;
  pressureLevel: string;
  topActions: string[];
  warnings: string[];
  sharedAt: string;
};
export type Pilot = {
  id: string;
  creatorUid: string;
  clientEmail: string;
  clientName: string;
  businessName: string;
  clientUid: string | null;
  serviceKey: ServiceKey;
  paymentMethod: PilotPaymentMethod;
  paymentStatus: PilotPaymentStatus;
  status: PilotStatus;
  inviteHash: string;
  consentAt: string | null;
  joinedAt: string | null;
  amountCents: number;
  currency: "aud";
  createdAt: string;
  updatedAt: string;
  paymentReference?: string;
  paidAt?: string;
  paidVerifiedBy?: string;
  stripeCheckoutSessionId?: string;
  reportSummary?: PilotReportSummary;
  notes?: string;
};
export type PublicPilot = Omit<Pilot, "inviteHash">;

export const PILOT_METHODS: readonly PilotPaymentMethod[] = ["free", "stripe", "cash", "payid", "bank-transfer"];
export function normalizePilotEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 250 ? email : null;
}
export function isCreatorUser(user: Pick<DecodedIdToken, "uid" | "email" | "email_verified">) {
  const creatorEmail = normalizePilotEmail(process.env.BUSINESS_LIFELINE_CREATOR_EMAIL);
  const creatorUid = (process.env.BUSINESS_LIFELINE_CREATOR_UID || process.env.BUSINESS_LIFELINE_OWNER_UID || "").trim();
  if (!user.email_verified || !normalizePilotEmail(user.email)) return false;
  // Never infer administrator rights from a public display name or email alone.
  // Reuse the previously configured, server-only studio Firebase UID.
  if (creatorUid) return user.uid === creatorUid && (!creatorEmail || normalizePilotEmail(user.email) === creatorEmail);
  return Boolean(creatorEmail && normalizePilotEmail(user.email) === creatorEmail);
}
export async function requirePilotUser(request: Request) {
  const user = await requireFirebaseUser(request);
  if (!user.email_verified || !normalizePilotEmail(user.email)) throw new Error("Verify your email to use a customer pilot.");
  return user;
}
export function requireCreator(user: DecodedIdToken) {
  if (!isCreatorUser(user)) throw new Error("Creator access denied.");
}
export function isPilotParticipant(pilot: Pilot, user: Pick<DecodedIdToken, "uid" | "email">) {
  return pilot.clientUid === user.uid && pilot.clientEmail === normalizePilotEmail(user.email);
}
export function publicPilot(pilot: Pilot): PublicPilot {
  const { inviteHash: _inviteHash, ...safe } = pilot;
  void _inviteHash;
  return safe;
}
export function makeInvite() {
  const code = crypto.randomBytes(32).toString("hex");
  return { code, hash: crypto.createHash("sha256").update(code).digest("hex") };
}
export function validInvite(code: unknown, expectedHash: string) {
  if (typeof code !== "string" || !/^[0-9a-f]{64}$/.test(code) || !/^[0-9a-f]{64}$/.test(expectedHash)) return false;
  const actual = crypto.createHash("sha256").update(code).digest();
  return crypto.timingSafeEqual(actual, Buffer.from(expectedHash, "hex"));
}
export function pilotPaymentAccess(pilot: Pick<Pilot, "paymentStatus" | "consentAt" | "status">) {
  return pilot.status === "active" && Boolean(pilot.consentAt) &&
    (pilot.paymentStatus === "paid" || pilot.paymentStatus === "waived");
}
export function pilotServiceKey(value: unknown) {
  return serviceByKey(value)?.key;
}
export function sanitizeReport(value: unknown): Omit<PilotReportSummary, "sharedAt"> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const report = value as Partial<PilotReportSummary>;
  if (typeof report.businessName !== "string" || report.businessName.length > 120) return null;
  if (typeof report.overallScore !== "number" || !Number.isFinite(report.overallScore) || report.overallScore < 0 || report.overallScore > 100) return null;
  if (typeof report.dataConfidence !== "number" || !Number.isFinite(report.dataConfidence) || report.dataConfidence < 0 || report.dataConfidence > 100) return null;
  if (typeof report.pressureLevel !== "string" || !["Stable","Watch","High","Severe","Critical"].includes(report.pressureLevel)) return null;
  if (!Array.isArray(report.topActions) || !Array.isArray(report.warnings) ||
    report.topActions.length > 4 || report.warnings.length > 5 ||
    ![...report.topActions,...report.warnings].every(x => typeof x === "string" && x.length <= 220)) return null;
  return {
    businessName: report.businessName.trim(),
    overallScore: report.overallScore,
    dataConfidence: report.dataConfidence,
    pressureLevel: report.pressureLevel,
    topActions: report.topActions,
    warnings: report.warnings,
  };
}
