import { NextResponse } from "next/server";
import { getFirebaseAdmin, requireFirebaseUser } from "@/lib/firebase-admin";
import { enforceRateLimit, privateResponseHeaders, rejectCrossSiteRequest } from "@/lib/api-security";
import { getPilotOffer, isPilotPaymentMethod, paymentMethodLabel, pilotPaymentInstructions } from "@/lib/pilot-service-payments";
import { studioOwnerUid } from "@/lib/pilot-access-server";

export const runtime = "nodejs";
const responseHeaders = privateResponseHeaders();

export async function POST(request: Request) {
  const crossSite = rejectCrossSiteRequest(request);
  if (crossSite) return crossSite;
  const limited = enforceRateLimit(request, "pilot-service-request");
  if (limited) return limited;
  if (!studioOwnerUid()) return NextResponse.json({ error: "Pilot intake is not available yet." }, { status: 503, headers: responseHeaders });

  try {
    const actor = await requireFirebaseUser(request);
    if (actor.email_verified !== true) {
      return NextResponse.json({ error: "Verify your email before requesting a paid service." }, { status: 403, headers: responseHeaders });
    }
    const data = await request.json() as { offerIndex?: unknown; method?: unknown };
    const offer = getPilotOffer(data.offerIndex);
    if (!offer || !isPilotPaymentMethod(data.method)) return NextResponse.json({ error: "Choose a valid offer and payment arrangement." }, { status: 400, headers: responseHeaders });
    const { db } = getFirebaseAdmin();
    const ref = db.collection("pilotServiceRequests").doc();
    const createdAt = new Date().toISOString();
    await ref.create({
      uid: actor.uid, email: actor.email || "", offerIndex: data.offerIndex, offerName: offer.name,
      amountAud: offer.price, currency: "AUD", paymentMethod: data.method, paymentStatus: "pending_arrangement",
      createdAt, updatedAt: createdAt, studioDecision: "pending", paymentProvider: "manual",
      // Never store card number, expiry, CVV, PayID bank details or passwords here.
    });
    return NextResponse.json({
      requestId: ref.id, status: "pending_arrangement", offerName: offer.name,
      amountAud: offer.price, method: paymentMethodLabel(data.method),
      instructions: pilotPaymentInstructions(data.method),
      message: "Request saved. Business Lifeline will contact you to confirm scope and arrange payment. You have not been charged.",
    }, { status: 201, headers: responseHeaders });
  } catch {
    return NextResponse.json({ error: "Could not save this request. Check your account and try again later." }, { status: 401, headers: responseHeaders });
  }
}
