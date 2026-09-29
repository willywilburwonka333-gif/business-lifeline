import crypto from "node:crypto";
import { verifyStripeWebhook } from "./stripe-billing";

process.env.STRIPE_WEBHOOK_SECRET = "test-secret";
const payload = JSON.stringify({ id: "evt_test", type: "checkout.session.completed" });
const timestamp = String(Math.floor(Date.now() / 1000));
const signature = crypto.createHmac("sha256", "test-secret").update(`${timestamp}.${payload}`, "utf8").digest("hex");

if (!verifyStripeWebhook(payload, `t=${timestamp},v1=${signature}`)) {
  throw new Error("Valid Stripe webhook signature was rejected.");
}
if (verifyStripeWebhook(payload + "x", `t=${timestamp},v1=${signature}`)) {
  throw new Error("Modified Stripe webhook payload was accepted.");
}
