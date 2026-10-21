import { NextResponse } from "next/server";
import { getFirebaseAdmin, requireFirebaseUser } from "@/lib/firebase-admin";
import { privateResponseHeaders, rejectCrossSiteRequest, requireFullPlatformRequest } from "@/lib/api-security";
import { priceFor, stripePost, type BillingPlan } from "@/lib/stripe-billing";
import { serviceByKey, type ServiceKey } from "@/lib/service-payments";
import { type Pilot } from "@/lib/pilot-project";
import { registeredTier } from "@/lib/pilot-access-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const crossSite = rejectCrossSiteRequest(request);
  if (crossSite) return crossSite;
  let user;
  try {
    user = await requireFirebaseUser(request);
  } catch {
    return NextResponse.json({ error: "Sign in to purchase a service." }, { status: 401, headers: privateResponseHeaders() });
  }

  try {
    const body = await request.json() as { plan?: BillingPlan; service?: ServiceKey; pilotId?: string };
    const service = serviceByKey(body.service);
    if (service && await registeredTier(user.uid) === "public") {
      return NextResponse.json({ error: "Demo-only accounts cannot purchase or unlock services. Contact Business Lifeline to arrange a guided pilot." }, { status: 403, headers: privateResponseHeaders() });
    }
    if (!service && (body.plan === "pro" || body.plan === "rescue")) {
      const denied = await requireFullPlatformRequest(request);
      if (denied) return denied;
    }
    if (service && !body.pilotId) {
      return NextResponse.json({ error: "Create or join a customer pilot before purchasing this diagnostic service." }, { status: 400, headers: privateResponseHeaders() });
    }
    if ((body.service !== undefined && !service) || (service && body.plan !== undefined)) {
      return NextResponse.json({ error: "Choose a valid service." }, { status: 400, headers: privateResponseHeaders() });
    }
    if (!service && body.plan !== "pro" && body.plan !== "rescue") {
      return NextResponse.json({ error: "Choose a valid paid plan or service." }, { status: 400, headers: privateResponseHeaders() });
    }
    if (service && (!process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_SERVICE_CHECKOUT_ENABLED !== "true")) {
      return NextResponse.json({ error: "Service payments are not ready for automatic confirmation. Contact Business Lifeline support." }, { status: 503, headers: privateResponseHeaders() });
    }
    const priceId = service ? service.priceId : priceFor(body.plan as "pro" | "rescue");
    if (!priceId) return NextResponse.json({ error: "Stripe price is not configured." }, { status: 503, headers: privateResponseHeaders() });

    const { db } = getFirebaseAdmin();
    let pilot: Pilot | null = null;
    if (body.pilotId) {
      if (!service || !/^[0-9a-f-]{36}$/.test(body.pilotId)) {
        return NextResponse.json({ error: "A pilot requires a valid service." }, { status: 400, headers: privateResponseHeaders() });
      }
      const pilotDoc = await db.collection("pilotProjects").doc(body.pilotId).get();
      if (!pilotDoc.exists) return NextResponse.json({ error: "Pilot not found." }, { status: 404, headers: privateResponseHeaders() });
      pilot = pilotDoc.data() as Pilot;
      if (pilot.clientUid !== user.uid || pilot.clientEmail !== user.email?.toLowerCase() || !user.email_verified ||
          pilot.serviceKey !== service.key || !pilot.consentAt || pilot.status !== "active" ||
          pilot.paymentMethod !== "stripe" || pilot.paymentStatus !== "pending") {
        return NextResponse.json({ error: "This pilot cannot start a card payment." }, { status: 403, headers: privateResponseHeaders() });
      }
    }
    const userRef = db.collection("users").doc(user.uid);
    const userSnapshot = await userRef.get();
    const customerId = userSnapshot.data()?.stripeCustomerId as string | undefined;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

    const params = new URLSearchParams();
    params.set("mode", service || body.plan === "rescue" ? "payment" : "subscription");
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("success_url", `${appUrl}/?billing=success&session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${appUrl}/?billing=cancelled`);
    params.set("client_reference_id", user.uid);
    params.set("metadata[uid]", user.uid);
    if (service) {
      params.set("metadata[service_key]", service.key);
      if (pilot) {
        params.set("metadata[pilot_id]", pilot.id);
        params.set("payment_intent_data[metadata][pilot_id]", pilot.id);
      }
      params.set("payment_intent_data[metadata][service_key]", service.key);
      params.set("payment_intent_data[metadata][uid]", user.uid);
      params.set("customer_creation", "always");
      params.set("invoice_creation[enabled]", "true");
    } else {
      params.set("metadata[plan]", body.plan!);
      if (body.plan === "pro") {
        params.set("subscription_data[metadata][uid]", user.uid);
        params.set("subscription_data[metadata][plan]", body.plan);
      }
    }
    if (customerId) params.set("customer", customerId);
    else if (user.email) params.set("customer_email", user.email);

    const session = await stripePost("/checkout/sessions", params);
    const url = typeof session.url === "string" ? session.url : null;
    if (!url) throw new Error("Stripe did not return a checkout URL.");
    return NextResponse.json({ url }, { headers: privateResponseHeaders() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start checkout." }, { status: 500, headers: privateResponseHeaders() });
  }
}
