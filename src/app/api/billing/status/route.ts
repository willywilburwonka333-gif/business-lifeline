import { NextResponse } from "next/server";
import { getFirebaseAdmin, requireFirebaseUser } from "@/lib/firebase-admin";
import { privateResponseHeaders } from "@/lib/api-security";
import { stripeConfigured } from "@/lib/stripe-billing";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const { db } = getFirebaseAdmin();
    const snapshot = await db.collection("users").doc(user.uid).get();
    const purchases = await db.collection("users").doc(user.uid)
      .collection("servicePurchases").orderBy("purchasedAt", "desc").limit(30).get();
    const data = snapshot.data() || {};
    return NextResponse.json({
      configured: stripeConfigured() && Boolean(process.env.STRIPE_PRO_PRICE_ID && process.env.STRIPE_RESCUE_PRICE_ID && process.env.STRIPE_WEBHOOK_SECRET),
      servicesConfigured: stripeConfigured() && Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      plan: data.billingPlan || "free",
      subscriptionStatus: data.subscriptionStatus || null,
      rescuePurchased: Boolean(data.rescuePurchased),
      customerReady: Boolean(data.stripeCustomerId),
      purchases: purchases.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      updatedAt: data.billingUpdatedAt || null,
    }, { headers: privateResponseHeaders() });
  } catch {
    return NextResponse.json({ configured: false, servicesConfigured: false, plan: "free", authenticated: false }, { status: 401, headers: privateResponseHeaders() });
  }
}
