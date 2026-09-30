import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { privateResponseHeaders } from "@/lib/api-security";
import { verifyStripeWebhook } from "@/lib/stripe-billing";

export const runtime = "nodejs";

type StripeObject = {
  id?: string;
  customer?: string;
  client_reference_id?: string;
  mode?: string;
  payment_status?: string;
  status?: string;
  metadata?: { uid?: string; plan?: string };
};

type StripeEvent = {
  id?: string;
  type?: string;
  data?: { object?: StripeObject };
};

async function userRefForCustomer(db: ReturnType<typeof getFirebaseAdmin>["db"], customerId: string) {
  const snapshot = await db.collection("users").where("stripeCustomerId", "==", customerId).limit(1).get();
  return snapshot.docs[0]?.ref ?? null;
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyStripeWebhook(raw, request.headers.get("stripe-signature"))) {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400, headers: privateResponseHeaders() });
  }

  try {
    const event = JSON.parse(raw) as StripeEvent;
    const object = event.data?.object || {};
    const { db } = getFirebaseAdmin();
    const now = new Date().toISOString();
    const eventId = event.id || "";
    if (eventId) {
      const eventRef = db.collection("stripeWebhookEvents").doc(eventId);
      try {
        await eventRef.create({ type: event.type || "unknown", receivedAt: now });
      } catch (createError) {
        const code = typeof createError === "object" && createError && "code" in createError ? String((createError as { code?: unknown }).code) : "";
        if (code === "6" || code.toLowerCase().includes("already-exists")) {
          return NextResponse.json({ received: true, duplicate: true }, { headers: privateResponseHeaders() });
        }
        throw createError;
      }
    }

    if (event.type === "checkout.session.completed") {
      const uid = object.metadata?.uid || object.client_reference_id;
      const plan = object.metadata?.plan;
      if (uid) {
        const update: Record<string, unknown> = {
          stripeCustomerId: object.customer || null,
          billingUpdatedAt: now,
          lastStripeEventId: event.id || null,
        };
        if (plan === "pro") {
          update.billingPlan = "pro";
          update.subscriptionStatus = "active";
        }
        if (plan === "rescue") {
          update.rescuePurchased = true;
          update.rescuePurchasedAt = now;
        }
        await db.collection("users").doc(uid).set(update, { merge: true });
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const customerId = object.customer;
      if (customerId) {
        const ref = await userRefForCustomer(db, customerId);
        if (ref) {
          const active = event.type !== "customer.subscription.deleted" && ["active", "trialing"].includes(object.status || "");
          await ref.set({
            billingPlan: active ? "pro" : "free",
            subscriptionStatus: object.status || (active ? "active" : "cancelled"),
            billingUpdatedAt: now,
            lastStripeEventId: event.id || null,
          }, { merge: true });
        }
      }
    }

    if (event.type === "invoice.payment_failed") {
      const customerId = object.customer;
      if (customerId) {
        const ref = await userRefForCustomer(db, customerId);
        if (ref) await ref.set({
          subscriptionStatus: "past_due",
          billingUpdatedAt: now,
          lastStripeEventId: event.id || null,
        }, { merge: true });
      }
    }

    return NextResponse.json({ received: true }, { headers: privateResponseHeaders() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook handling failed." }, { status: 500, headers: privateResponseHeaders() });
  }
}
