import { NextResponse } from "next/server";
import { getFirebaseAdmin, requireFirebaseUser } from "@/lib/firebase-admin";
import { enforceRateLimit, privateResponseHeaders, rejectCrossSiteRequest } from "@/lib/api-security";
import { requireStudioOwner, studioOwnerUid } from "@/lib/pilot-access-server";

export const runtime = "nodejs";
const headers = privateResponseHeaders();

async function verifiedStudioOwner(request: Request) {
  if (!studioOwnerUid()) throw new Error("Studio owner is not configured.");
  const user = await requireFirebaseUser(request);
  requireStudioOwner(user.uid);
  return user;
}

export async function GET(request: Request) {
  try {
    await verifiedStudioOwner(request);
    const { db } = getFirebaseAdmin();
    const documents = await db.collection("pilotServiceRequests").orderBy("createdAt", "desc").limit(100).get();
    return NextResponse.json({
      requests: documents.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      truncated: documents.size === 100,
    }, { headers });
  } catch {
    return NextResponse.json({ error: "Creator approval is required." }, { status: 403, headers });
  }
}

export async function POST(request: Request) {
  const crossSite = rejectCrossSiteRequest(request);
  if (crossSite) return crossSite;
  const limited = enforceRateLimit(request, "pilot-payment-review");
  if (limited) return limited;
  try {
    const actor = await verifiedStudioOwner(request);
    const data = await request.json() as { id?: unknown; action?: unknown };
    if (typeof data.id !== "string" || !/^[A-Za-z0-9]{8,60}$/.test(data.id) || (data.action !== "verify_payment" && data.action !== "cancel")) {
      return NextResponse.json({ error: "Invalid service request or action." }, { status: 400, headers });
    }
    const { db } = getFirebaseAdmin();
    const ref = db.collection("pilotServiceRequests").doc(data.id);
    const audit = db.collection("pilotAudit").doc();
    const now = new Date().toISOString();
    const nextStatus = data.action === "verify_payment" ? "paid_verified" : "cancelled";
    await db.runTransaction(async tx => {
      const existing = await tx.get(ref);
      if (!existing.exists || existing.data()?.paymentStatus !== "pending_arrangement") {
        throw new Error("Request must be pending to change payment status.");
      }
      tx.update(ref, { paymentStatus: nextStatus, updatedAt: now, reviewedBy: actor.uid });
      tx.create(audit, { action: data.action, requestId: data.id, actorUid: actor.uid, at: now });
    });
    return NextResponse.json({ id: data.id, paymentStatus: nextStatus }, { headers });
  } catch {
    return NextResponse.json({ error: "Unable to change request. Confirm Creator access and the request's pending status." }, { status: 403, headers });
  }
}
