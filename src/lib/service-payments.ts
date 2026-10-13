import { DIAGNOSTIC_OFFERS } from "./diagnostic-offers";

/**
 * Public Stripe catalogue identifiers for the five AUD one-time diagnostic services.
 * Secrets must never appear in this module. The live Stripe account is the source
 * of truth for these price IDs; amounts and currency are verified at fulfilment.
 */
export const SERVICE_CATALOG = [
  { key: "lifeline_pulse", offer: DIAGNOSTIC_OFFERS[0], priceId: "price_1UQ1L6GaeV9Fg3NJlxFquATx", paymentLink: "https://buy.stripe.com/4gMcN5domgwh4Fj7sz4Ja09" },
  { key: "business_mri", offer: DIAGNOSTIC_OFFERS[1], priceId: "price_1UQ1LJGaeV9Fg3NJYsdjKhO8", paymentLink: "https://buy.stripe.com/dRm5kD986cg1dbP5kr4Ja0a" },
  { key: "deep_scan", offer: DIAGNOSTIC_OFFERS[2], priceId: "price_1UQ1LLGaeV9Fg3NJ1NV3677h", paymentLink: "https://buy.stripe.com/14A3cv2JIgwh4Fj3cj4Ja0b" },
  { key: "recovery_map", offer: DIAGNOSTIC_OFFERS[3], priceId: "price_1UQ1LNGaeV9Fg3NJ8F7iWFYd", paymentLink: "https://buy.stripe.com/aFa6oH9865RDdbP6ov4Ja0c" },
  { key: "recovery_intensive", offer: DIAGNOSTIC_OFFERS[4], priceId: "price_1UQ1LPGaeV9Fg3NJwmz7crOI", paymentLink: "https://buy.stripe.com/00weVd4RQ2FrdbP5kr4Ja0d" },
] as const;

export type ServiceKey = (typeof SERVICE_CATALOG)[number]["key"];

export function serviceByKey(value: unknown) {
  return SERVICE_CATALOG.find(service => service.key === value);
}

export function verifiedServicePayment(session: {
  id?: string;
  mode?: string;
  payment_status?: string;
  amount_total?: number;
  currency?: string;
  metadata?: { service_key?: string };
}) {
  const service = serviceByKey(session.metadata?.service_key);
  if (!service || !session.id || !session.id.startsWith("cs_")) return null;
  if (session.mode !== "payment" || session.payment_status !== "paid") return null;
  if (session.currency?.toLowerCase() !== "aud") return null;
  if (session.amount_total !== Math.round(service.offer.price * 100)) return null;
  return service;
}
