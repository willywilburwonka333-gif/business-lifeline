import { NextResponse } from "next/server";
import { getFirebaseAdmin, requireFirebaseUser } from "@/lib/firebase-admin";
import { privateResponseHeaders, rejectCrossSiteRequest } from "@/lib/api-security";
import { priceFor, stripePost, type BillingPlan } from "@/lib/stripe-billing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const crossSite = rejectCrossSiteRequest(request);
  if (crossSite) return crossSite;
  try {
    const user = await requireFirebaseUser(request);
    const body = await request.json() as { plan?: BillingPlan };
    if (body.plan !== "pro" && body.plan !== "rescue") {
      return NextResponse.json({ error: "Choose a valid paid plan." }, { status: 400, headers: privateResponseHeaders() });
    }
    const priceId = priceFor(body.plan);
    if (!priceId) return NextResponse.json({ error: `Stripe price for ${body.plan} is not configured.` }, { status: 503, headers: privateResponseHeaders() });

    const { db } = getFirebaseAdmin();
    const userRef = db.collection("users").doc(user.uid);
    const userSnapshot = await userRef.get();
    const customerId = userSnapshot.data()?.stripeCustomerId as string | undefined;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

    const params = new URLSearchParams();
    params.set("mode", body.plan === "pro" ? "subscription" : "payment");
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("success_url", `${appUrl}/?billing=success&session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${appUrl}/?billing=cancelled`);
    params.set("client_reference_id", user.uid);
    params.set("metadata[uid]", user.uid);
    params.set("metadata[plan]", body.plan);
    if (body.plan === "pro") {
      params.set("subscription_data[metadata][uid]", user.uid);
      params.set("subscription_data[metadata][plan]", body.plan);
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
