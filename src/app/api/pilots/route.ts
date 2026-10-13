import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { privateResponseHeaders, rejectCrossSiteRequest, enforceRateLimit } from "@/lib/api-security";
import { makeInvite, normalizePilotEmail, pilotPaymentAccess, pilotServiceKey, publicPilot,
  requireCreator, requirePilotUser, isCreatorUser, isPilotParticipant, sanitizeReport,
  type Pilot, type PilotPaymentMethod } from "@/lib/pilot-project";
import { serviceByKey, verifiedServicePayment } from "@/lib/service-payments";

export const runtime = "nodejs";
const headers = privateResponseHeaders();
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status, headers });
const clean = (value: unknown, max = 120) => typeof value === "string" ? value.trim().slice(0, max) : "";
const urlFor = (request: Request, id: string, code: string) => {
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const link = new URL("/", origin);
  link.searchParams.set("pilot", id);
  link.searchParams.set("invite", code);
  return link.toString();
};

export async function GET(request: Request) {
  try {
    const user = await requirePilotUser(request);
    const db = getFirebaseAdmin().db;
    const creator = isCreatorUser(user);
    const snapshot = creator
      ? await db.collection("pilotProjects").where("creatorUid", "==", user.uid).limit(100).get()
      : await db.collection("pilotProjects").where("clientUid", "==", user.uid).limit(30).get();
    const pilots = snapshot.docs.map(doc => publicPilot(doc.data() as Pilot))
      .filter(p => creator || (p.clientEmail === normalizePilotEmail(user.email) && p.clientUid === user.uid))
      .sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    return NextResponse.json({ role: creator ? "creator" : "client", pilots }, { headers });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to load pilots.", 401);
  }
}

export async function POST(request: Request) {
  const cross = rejectCrossSiteRequest(request); if (cross) return cross;
  const limit = enforceRateLimit(request, "pilot-create"); if (limit) return limit;
  try {
    const user = await requirePilotUser(request);
    requireCreator(user);
    const body = await request.json() as Record<string, unknown>;
    const clientEmail = normalizePilotEmail(body.clientEmail);
    const clientName = clean(body.clientName, 100);
    const businessName = clean(body.businessName, 120);
    const serviceKey = pilotServiceKey(body.serviceKey);
    const paymentMethod = body.paymentMethod as PilotPaymentMethod;
    if (!clientEmail || !clientName || !businessName || !serviceKey ||
      !["free","stripe","cash","payid","bank-transfer"].includes(paymentMethod))
      return fail("Enter the client's name, valid email, business, service and payment method.");
    if (clean(body.notes, 500).length > 500) return fail("Notes are too long.");
    const offer = serviceByKey(serviceKey)!;
    const { code, hash } = makeInvite();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const pilot: Pilot = {
      id, creatorUid: user.uid, clientEmail, clientName, businessName, clientUid: null,
      serviceKey, paymentMethod, paymentStatus: paymentMethod === "free" ? "waived" : "pending",
      status: "invited", inviteHash: hash, consentAt: null, joinedAt: null,
      amountCents: offer.offer.price * 100, currency: "aud", createdAt: now, updatedAt: now,
      notes: clean(body.notes, 500),
    };
    await getFirebaseAdmin().db.collection("pilotProjects").doc(id).create(pilot);
    return NextResponse.json({ pilot: publicPilot(pilot), inviteUrl: urlFor(request,id,code) }, { status: 201, headers });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to create pilot.", 403);
  }
}

export async function PATCH(request: Request) {
  const cross = rejectCrossSiteRequest(request); if (cross) return cross;
  const limit = enforceRateLimit(request, "pilot-action"); if (limit) return limit;
  try {
    const user = await requirePilotUser(request);
    const body = await request.json() as Record<string, unknown>;
    const id = clean(body.pilotId, 80);
    if (!/^[0-9a-f-]{36}$/.test(id)) return fail("Unknown pilot.");
    const { db } = getFirebaseAdmin();
    const ref = db.collection("pilotProjects").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return fail("Pilot not found.", 404);
    const pilot = snap.data() as Pilot;
    const creator = isCreatorUser(user) && pilot.creatorUid === user.uid;
    const client = isPilotParticipant(pilot, user);
    const action = body.action;

    if (action === "report") {
      if (!client || !pilotPaymentAccess(pilot)) return fail("Join an active pilot with confirmed payment before sharing a report.", 403);
      if (body.confirmShare !== true) return fail("Explicit consent to share this summary is required.");
      const report = sanitizeReport(body.report);
      if (!report) return fail("Invalid diagnostic summary.");
      await ref.update({ reportSummary: { ...report, sharedAt: new Date().toISOString() }, updatedAt: new Date().toISOString() });
      return NextResponse.json({ saved: true }, { headers });
    }
    if (!creator) return fail("Only the pilot creator can manage payments and pilot status.", 403);

    if (action === "manual_paid") {
      if (!["cash","payid","bank-transfer"].includes(pilot.paymentMethod) || pilot.paymentStatus !== "pending")
        return fail("This pilot is not awaiting a manual payment.");
      const paymentReference = clean(body.paymentReference, 120);
      if (body.confirmReceived !== true || paymentReference.length < 4)
        return fail("Verify full payment was actually received and enter a transaction or receipt reference.");
      const now = new Date().toISOString();
      await db.runTransaction(async tx => {
        const current = await tx.get(ref);
        if (!current.exists || current.data()?.paymentStatus !== "pending" || current.data()?.paymentMethod !== pilot.paymentMethod)
          throw new Error("Payment status changed. Refresh.");
        tx.update(ref, { paymentStatus: "paid", paidAt: now, paidVerifiedBy: user.uid, paymentReference, updatedAt: now });
        tx.create(db.collection("pilotPaymentEvents").doc(crypto.randomUUID()), {
          pilotId: id, method: pilot.paymentMethod, amountCents: pilot.amountCents, currency: "aud",
          paymentReference, confirmedBy: user.uid, confirmedAt: now,
        });
      });
      return NextResponse.json({ saved: true }, { headers });
    }
    if (action === "reissue") {
      if (pilot.clientUid || pilot.status !== "invited") return fail("Only an unclaimed invitation can be regenerated.");
      const { code, hash } = makeInvite();
      await ref.update({ inviteHash: hash, updatedAt: new Date().toISOString() });
      return NextResponse.json({ inviteUrl: urlFor(request,id,code) }, { headers });
    }
    if (action === "set_status") {
      if (!["completed","cancelled"].includes(String(body.status))) return fail("Invalid pilot status.");
      if (pilot.status === "cancelled" || pilot.status === "completed") return fail("This pilot is already closed.");
      await ref.update({ status: body.status, updatedAt: new Date().toISOString() });
      return NextResponse.json({ saved: true }, { headers });
    }
    if (action === "reconcile_stripe") {
      if (pilot.paymentMethod !== "stripe" || pilot.paymentStatus !== "pending")
        return fail("Pilot is not awaiting Stripe payment.");
      const sessionId = clean(body.sessionId, 200);
      if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId)) return fail("Enter a valid Stripe Checkout session ID.");
      const secret = process.env.STRIPE_SECRET_KEY;
      if (!secret) return fail("Stripe server credentials are not configured.", 503);
      const response = await fetch("https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(sessionId), {
        headers: { Authorization: "Bearer " + secret }, cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) return fail("Stripe could not verify that payment.", 502);
      const session = await response.json() as {
        id?: string; mode?: string; payment_status?: string; amount_total?: number; currency?: string;
        metadata?: { service_key?: string; pilot_id?: string; uid?: string };
        customer_details?: { email?: string };
        payment_link?: string | null;
      };
      const service = verifiedServicePayment(session);
      if (!service || service.key !== pilot.serviceKey ||
        (session.metadata?.pilot_id && session.metadata.pilot_id !== id) ||
        normalizePilotEmail(session.customer_details?.email) !== pilot.clientEmail)
        return fail("Stripe transaction does not match this client's service, email, price and currency.", 409);
      const now = new Date().toISOString();
      const orderRef = db.collection("serviceOrders").doc(sessionId);
      await db.runTransaction(async tx => {
        const [current, order] = await Promise.all([tx.get(ref), tx.get(orderRef)]);
        if (!current.exists || current.data()?.paymentStatus !== "pending")
          throw new Error("Pilot payment status has changed.");
        if (order.exists && order.data()?.pilotId && order.data()?.pilotId !== id)
          throw new Error("This Stripe payment has already been applied to a different pilot.");
        tx.set(orderRef, {
          pilotId: id, serviceKey: service.key, amountCents: pilot.amountCents, currency: "aud",
          paymentStatus: "paid", method: "stripe", stripeCheckoutSessionId: sessionId,
          uid: current.data()?.clientUid || null, paidAt: now, source: session.payment_link ? "payment_link" : "app_checkout",
        }, { merge: true });
        tx.update(ref, { paymentStatus: "paid", paidAt: now, stripeCheckoutSessionId: sessionId, paidVerifiedBy: user.uid, updatedAt: now });
      });
      return NextResponse.json({ saved: true }, { headers });
    }
    return fail("Unknown pilot action.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Pilot update failed.", 403);
  }
}
