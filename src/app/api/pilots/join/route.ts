import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { rejectCrossSiteRequest, privateResponseHeaders, enforceRateLimit } from "@/lib/api-security";
import { normalizePilotEmail, publicPilot, requirePilotUser, validInvite, type Pilot, type PilotPaymentMethod } from "@/lib/pilot-project";

export const runtime = "nodejs";
const headers = privateResponseHeaders();
export async function POST(request: Request) {
  const cross = rejectCrossSiteRequest(request); if (cross) return cross;
  const limit = enforceRateLimit(request, "pilot-claim"); if (limit) return limit;
  try {
    const user = await requirePilotUser(request);
    const body = await request.json() as { pilotId?: string; invite?: string; consent?: boolean; paymentMethod?: PilotPaymentMethod };
    if (!body.pilotId || !/^[0-9a-f-]{36}$/.test(body.pilotId) || body.consent !== true)
      return NextResponse.json({ error: "Choose an invitation and accept the pilot terms." }, { status: 400, headers });
    const ref = getFirebaseAdmin().db.collection("pilotProjects").doc(body.pilotId);
    const now = new Date().toISOString();
    let updated: Pilot | null = null;
    await getFirebaseAdmin().db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Pilot invitation not found.");
      const pilot = snap.data() as Pilot;
      if (!validInvite(body.invite, pilot.inviteHash)) throw new Error("This invitation is invalid or expired.");
      if (pilot.clientEmail !== normalizePilotEmail(user.email)) throw new Error("This invitation is for a different verified email address.");
      if (pilot.clientUid && pilot.clientUid !== user.uid) throw new Error("This pilot has been claimed by another account.");
      if (pilot.status !== "invited" && pilot.status !== "active") throw new Error("This pilot is closed.");
      const selectedMethod = body.paymentMethod || pilot.paymentMethod;
      if (!["free","stripe","cash","payid","bank-transfer"].includes(selectedMethod))
        throw new Error("Choose a supported payment method.");
      if (pilot.paymentStatus !== "waived" && selectedMethod === "free")
        throw new Error("Free access must be approved by the creator.");
      if (pilot.paymentStatus === "paid" && selectedMethod !== pilot.paymentMethod)
        throw new Error("Payment method cannot be changed after payment.");
      // Free pilots stay free. Others remain pending until verified externally.
      const finalMethod = pilot.paymentStatus === "waived" ? "free" : selectedMethod;
      tx.update(ref, { clientUid: user.uid, joinedAt: pilot.joinedAt || now,
        consentAt: pilot.consentAt || now, paymentMethod: finalMethod,
        status: "active", updatedAt: now });
      updated = { ...pilot, clientUid: user.uid, joinedAt: pilot.joinedAt || now,
        consentAt: pilot.consentAt || now, paymentMethod: finalMethod,
        status: "active", updatedAt: now };
    });
    return NextResponse.json({ pilot: publicPilot(updated!) }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Pilot join failed." }, { status: 403, headers });
  }
}
