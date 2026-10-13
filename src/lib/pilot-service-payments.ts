import { DIAGNOSTIC_OFFERS } from "@/lib/diagnostic-offers";

export const PILOT_PAYMENT_METHODS = ["cash", "payid", "card"] as const;
export type PilotPaymentMethod = typeof PILOT_PAYMENT_METHODS[number];
export type PilotRequestStatus = "pending_arrangement" | "paid_verified" | "cancelled";

export function getPilotOffer(offerIndex: unknown) {
  if (!Number.isInteger(offerIndex) || typeof offerIndex !== "number" || offerIndex < 0 || offerIndex >= DIAGNOSTIC_OFFERS.length) {
    return null;
  }
  return DIAGNOSTIC_OFFERS[offerIndex];
}

export function isPilotPaymentMethod(value: unknown): value is PilotPaymentMethod {
  return PILOT_PAYMENT_METHODS.some(method => method === value);
}

export function paymentMethodLabel(method: PilotPaymentMethod) {
  return { cash: "Cash (arranged appointment)", payid: "PayID (manual transfer)", card: "Card (external terminal/payment link)" }[method];
}

export function pilotPaymentInstructions(method: PilotPaymentMethod) {
  switch (method) {
    case "cash": return "Cash is collected at an agreed in-person appointment. No money has been received online.";
    case "payid": return "Payment details will be provided directly by Business Lifeline. Verify the recipient before transferring. Your request is not paid until the transfer is confirmed.";
    case "card": return "Business Lifeline will arrange a separate secure card terminal or payment link. No card payment has been taken and we will never ask you to type a card number into this form.";
  }
}
