import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { privateResponseHeaders } from "@/lib/api-security";
import { verifyStripeWebhook } from "@/lib/stripe-billing";
import { verifiedServicePayment } from "@/lib/service-payments";
import type { Pilot } from "@/lib/pilot-project";

export const runtime = "nodejs";

type StripeObject = {
  id?: string;
  customer?: string;
  client_reference_id?: string;
  payment_link?: string | null;
  payment_intent?: string | null;
  mode?: string;
  amount_total?: number;
  currency?: string;
  payment_status?: string;
  status?: string;
  customer_details?: { email?: string; name?: string };
  metadata?: { uid?: string; plan?: string; service_key?: string; pilot_id?: string };
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
    const { db, auth } = getFirebaseAdmin();
    const now = new Date().toISOString();
    const eventId = event.id || "";
    const eventRef = eventId ? db.collection("stripeWebhookEvents").doc(eventId) : null;

    // Only skip events that were successfully processed. Failed events must
    // remain retryable; recording them before processing can lose payments.
    if (eventRef && (await eventRef.get()).data()?.processedAt) {
      return NextResponse.json({ received: true, duplicate: true }, { headers: privateResponseHeaders() });
    }

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const uid = object.metadata?.uid || object.client_reference_id;
      const plan = object.metadata?.plan;
      const service = verifiedServicePayment(object);
      if (service) {
        // Direct shareable Payment Links don't prove the payer's Firebase uid.
        // Record them for owner reconciliation, but never grant an account access.
        const accountUid = object.payment_link ? null : uid;
        const order = {
          stripeCheckoutSessionId: object.id,
          serviceKey: service.key,
          serviceName: service.offer.name,
          amountCents: Math.round(service.offer.price * 100),
          currency: "aud",
          paymentStatus: "paid",
          method: "stripe",
          stripeCustomerId: object.customer || null,
          stripePaymentIntentId: object.payment_intent || null,
          customerEmail: object.customer_details?.email || null,
          customerName: object.customer_details?.name || null,
          paidAt: now,
          uid: accountUid || null,
          source: object.payment_link ? "payment_link" : "app_checkout",
        };
        await db.collection("serviceOrders").doc(object.id!).set(order, { merge: true });
        if (accountUid && object.metadata?.pilot_id) {
          const pilotRef = db.collection("pilotProjects").doc(object.metadata.pilot_id);
          await db.runTransaction(async tx => {
            const existing = await tx.get(pilotRef);
            if (!existing.exists) throw new Error("Paid pilot has no matching project.");
            const pilot = existing.data() as Pilot;
            if (pilot.clientUid !== accountUid || pilot.serviceKey !== service.key ||
                pilot.paymentMethod !== "stripe" || !pilot.consentAt || pilot.status !== "active")
              throw new Error("Paid pilot does not match authorised service account.");
            if (pilot.paymentStatus === "paid") {
              if (pilot.stripeCheckoutSessionId !== object.id) throw new Error("A different session paid this pilot.");
              return;
            }
            if (pilot.paymentStatus !== "pending") throw new Error("Pilot payment is not pending.");
            tx.update(pilotRef, {
              paymentStatus: "paid", paidAt: now, stripeCheckoutSessionId: object.id,
              updatedAt: now,
            });
          });
          await db.collection("serviceOrders").doc(object.id!).set({ pilotId: object.metadata.pilot_id }, { merge: true });
        }
        if (accountUid) {
          // Verify the Firebase user still exists before assigning entitlements.
          try {
            await auth.getUser(accountUid);
            await db.collection("users").doc(accountUid).collection("servicePurchases").doc(object.id!).set({
              stripeCheckoutSessionId: object.id,
              serviceKey: service.key,
              serviceName: service.offer.name,
              amountCents: order.amountCents,
              currency: "aud",
              paymentStatus: "paid",
              purchasedAt: now,
            }, { merge: true });
            await db.collection("users").doc(accountUid).set({
              stripeCustomerId: object.customer || null,
              billingUpdatedAt: now,
              lastStripeEventId: event.id || null,
            }, { merge: true });
          } catch (error) {
            // Keep the paid order for manual reconciliation. Never silently
            // allocate the purchase to another uid based on email alone.
            if (error && typeof error === "object" && "code" in error &&
                String((error as { code?: unknown }).code).includes("user-not-found")) {
              await db.collection("serviceOrders").doc(object.id!).set({ uid: null, reconcileReason: "account_not_found" }, { merge: true });
            } else throw error;
          }
        }
      } else if (object.metadata?.service_key) {
        // Unexpected amount/currency/unpaid status cannot unlock a service.
        // An asynchronous pending payment can be resolved by a later success event.
      } else if (event.type === "checkout.session.completed" && uid) {
        const update: Record<string, unknown> = {
          stripeCustomerId: object.customer || null,
          billingUpdatedAt: now,
          lastStripeEventId: event.id || null,
        };
        if (plan === "pro") {
          update.billingPlan = "pro";
          update.subscriptionStatus = "active";
        }
        if (plan === "rescue" && object.payment_status === "paid") {
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

    if (eventRef) await eventRef.set({ type: event.type || "unknown", processedAt: now }, { merge: true });
    return NextResponse.json({ received: true }, { headers: privateResponseHeaders() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook handling failed." }, { status: 500, headers: privateResponseHeaders() });
  }
}
