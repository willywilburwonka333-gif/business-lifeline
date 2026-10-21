import { getFirebaseAdmin } from "@/lib/firebase-admin";
import type { PilotTier } from "@/lib/pilot-access";

export function studioOwnerUid() {
  return process.env.BUSINESS_LIFELINE_OWNER_UID?.trim() || "";
}

export function isStudioOwner(uid: string) {
  return Boolean(studioOwnerUid()) && uid === studioOwnerUid();
}

export function requireStudioOwner(uid: string) {
  if (!isStudioOwner(uid)) throw new Error("Studio owner permission required.");
}

export async function registeredTier(uid: string): Promise<PilotTier> {
  if (isStudioOwner(uid)) {
    const { db } = getFirebaseAdmin();
    const ref = db.collection("pilotAccess").doc(uid);
    const previous = await ref.get();
    if (!previous.exists || previous.data()?.tier !== "full") {
      await ref.set({ tier: "full", isStudioOwner: true, updatedAt: new Date().toISOString(), updatedBy: "studio-bootstrap" }, { merge: true });
    }
    return "full";
  }
  const { db } = getFirebaseAdmin();
  const entitlement = await db.collection("pilotAccess").doc(uid).get();
  const tier = entitlement.data()?.tier;
  return tier === "full" || tier === "pilot" ? tier : "public";
}
