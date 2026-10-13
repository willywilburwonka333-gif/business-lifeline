import assert from "node:assert/strict";
import test from "node:test";
import { DIAGNOSTIC_OFFERS } from "./diagnostic-offers.ts";
import { getPilotOffer, isPilotPaymentMethod, pilotPaymentInstructions } from "./pilot-service-payments.ts";

test("only the five published offers can be selected, with server-side prices", () => {
  assert.equal(DIAGNOSTIC_OFFERS.length, 5);
  for (let i = 0; i < 5; i++) assert.equal(getPilotOffer(i), DIAGNOSTIC_OFFERS[i]);
  for (const value of [-1, 5, NaN, Infinity, "0", null, 1.5]) assert.equal(getPilotOffer(value), null);
});
test("pilot service requests accept only cash, card, PayID; never Stripe", () => {
  for (const value of ["cash", "card", "payid"]) assert.ok(isPilotPaymentMethod(value));
  for (const value of ["stripe", "credit-card-details", "", null]) assert.equal(isPilotPaymentMethod(value), false);
});
test("every payment choice discloses pending manual confirmation", () => {
  assert.match(pilotPaymentInstructions("cash"), /No money has been received/i);
  assert.match(pilotPaymentInstructions("payid"), /not paid/i);
  assert.match(pilotPaymentInstructions("card"), /No card payment has been taken/i);
});
