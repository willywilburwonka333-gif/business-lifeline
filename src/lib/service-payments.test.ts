import assert from "node:assert/strict";
import test from "node:test";
import { SERVICE_CATALOG, serviceByKey, verifiedServicePayment } from "./service-payments";

test("all five services have unique live Stripe prices, one-time checkout links and matching offer amounts", () => {
  assert.equal(SERVICE_CATALOG.length, 5);
  assert.equal(new Set(SERVICE_CATALOG.map(service => service.key)).size, 5);
  assert.equal(new Set(SERVICE_CATALOG.map(service => service.priceId)).size, 5);
  assert.deepEqual(SERVICE_CATALOG.map(service => service.offer.price), [49, 99, 199, 349, 599]);
  for (const service of SERVICE_CATALOG) {
    assert.ok(service.priceId.startsWith("price_"));
    assert.match(service.paymentLink, /^https:\/\/buy\.stripe\.com\//);
    assert.equal(serviceByKey(service.key), service);
  }
  assert.equal(serviceByKey("unknown_service"), undefined);
});

test("purchased service must have a paid, full-amount AUD Checkout Session", () => {
  for (const service of SERVICE_CATALOG) {
    const valid = { id: "cs_test_123", mode: "payment", payment_status: "paid", amount_total: service.offer.price * 100, currency: "aud", metadata: { service_key: service.key } };
    assert.equal(verifiedServicePayment(valid), service);
    assert.equal(verifiedServicePayment({ ...valid, payment_status: "unpaid" }), null);
    assert.equal(verifiedServicePayment({ ...valid, amount_total: 1 }), null);
    assert.equal(verifiedServicePayment({ ...valid, currency: "usd" }), null);
    assert.equal(verifiedServicePayment({ ...valid, mode: "subscription" }), null);
    assert.equal(verifiedServicePayment({ ...valid, metadata: { service_key: "other" } }), null);
    assert.equal(verifiedServicePayment({ ...valid, id: "fake" }), null);
  }
});
