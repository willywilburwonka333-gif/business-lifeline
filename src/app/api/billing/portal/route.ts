import { NextResponse } from "next/server";
import { getFirebaseAdmin, requireFirebaseUser } from "@/lib/firebase-admin";
import { privateResponseHeaders, rejectCrossSiteRequest } from "@/lib/api-security";
import { stripePost } from "@/lib/stripe-billing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const crossSite = rejectCrossSiteRequest(request);
  if (crossSite) return crossSite;
  try {
    const user = await requireFirebaseUser(request);
    const { db } = getFirebaseAdmin();
    const snapshot = await db.collection("users").doc(user.uid).get();
    const customerId = snapshot.data()?.stripeCustomerId as string | undefined;
    if (!customerId) return NextResponse.json({ error: "No Stripe customer exists for this account yet." }, { status: 409, headers: privateResponseHeaders() });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const params = new URLSearchParams({ customer: customerId, return_url: appUrl });
    const session = await stripePost("/billing_portal/sessions", params);
    if (typeof session.url !== "string") throw new Error("Stripe did not return a billing portal URL.");
    return NextResponse.json({ url: session.url }, { headers: privateResponseHeaders() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to open billing portal." }, { status: 500, headers: privateResponseHeaders() });
  }
}
