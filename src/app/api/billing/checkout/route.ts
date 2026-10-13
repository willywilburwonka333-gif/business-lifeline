import { NextResponse } from "next/server";
import { getFirebaseAdmin, requireFirebaseUser } from "@/lib/firebase-admin";
import { privateResponseHeaders, rejectCrossSiteRequest } from "@/lib/api-security";
import { priceFor, stripePost, type BillingPlan } from "@/lib/stripe-billing";
import { serviceByKey, type ServiceKey } from "@/lib/service-payments";

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
    const body = await request.json() as { plan?: BillingPlan; service?: ServiceKey };
    const service = serviceByKey(body.service);
    if ((body.service !== undefined && !service) || (service && body.plan !== undefined)) {
      return NextResponse.json({ error: "Choose a valid service." }, { status: 400, headers: privateResponseHeaders() });
    }
    if (!service && body.plan !== "pro" && body.plan !== "rescue") {
      return NextResponse.json({ error: "Choose a valid paid plan or service." }, { status: 400, headers: privateResponseHeaders() });
    }
    if (service && !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Service payments are not ready for automatic confirmation. Contact Business Lifeline support." }, { status: 503, headers: privateResponseHeaders() });
    }
    const priceId = service ? service.priceId : priceFor(body.plan as "pro" | "rescue");
    if (!priceId) return NextResponse.json({ error: "Stripe price is not configured." }, { status: 503, headers: privateResponseHeaders() });

    const { db } = getFirebaseAdmin();
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
