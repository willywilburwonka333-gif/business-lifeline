import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateStocktake,
  convertAcceptedQuote,
  createReorderDrafts,
  endOfDaySummary,
  invoiceFollowUp,
  nextQuoteStatus,
} from "./connected-operations.ts";

test("quote stages advance in order and stop at paid", () => {
  assert.equal(nextQuoteStatus("draft"), "sent");
  assert.equal(nextQuoteStatus("accepted"), "invoiced");
  assert.equal(nextQuoteStatus("paid"), "paid");
});

test("accepted quote creates linked job and draft invoice", () => {
  const converted = convertAcceptedQuote({
    quoteId: "q1",
    customerId: "c1",
    customerName: "Riverbend Café",
    description: "Catering order",
    amount: 1250,
    now: "2026-07-20T00:00:00.000Z",
  });
  assert.equal(converted.job.customerId, "c1");
  assert.equal(converted.job.value, 1250);
  assert.equal(converted.invoice.status, "draft");
  assert.equal(converted.invoice.dueAt, "2026-08-03T00:00:00.000Z");
});

test("overdue invoice creates an urgent follow-up", () => {
  const converted = convertAcceptedQuote({
    quoteId: "q2",
    customerId: "c2",
    customerName: "Market Customer",
    description: "Order",
    amount: 500,
    now: "2026-07-01T00:00:00.000Z",
  });
  const task = invoiceFollowUp({ ...converted.invoice, status: "sent" }, "2026-07-20T00:00:00.000Z");
  assert.equal(task?.priority, "urgent");
  assert.match(task?.detail ?? "", /\$500/);
});

test("stocktake calculates unit and value variance", () => {
  const [result] = calculateStocktake([{ productId: "p1", productName: "Soap", expected: 10, counted: 8, costPrice: 4 }]);
  assert.equal(result.variance, -2);
  assert.equal(result.varianceValue, -8);
});

test("reorder drafts only include products at or below threshold", () => {
  const drafts = createReorderDrafts([
    { id: "p1", name: "Low item", quantity: 2, reorderAt: 3, targetLevel: 10, supplier: "Supplier A", costPrice: 5 },
    { id: "p2", name: "Healthy item", quantity: 9, reorderAt: 3, targetLevel: 10, supplier: "Supplier B", costPrice: 5 },
  ]);
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].quantity, 8);
  assert.equal(drafts[0].estimatedCost, 40);
});

test("end of day reconciles sales, expenses and cash", () => {
  const summary = endOfDaySummary({
    sales: [{ total: 100, payment: "Cash" }, { total: 200, payment: "Card" }],
    expenses: [{ amount: 20 }],
    openingCash: 50,
    closingCash: 125,
  });
  assert.equal(summary.salesTotal, 300);
  assert.equal(summary.expectedClosingCash, 130);
  assert.equal(summary.cashVariance, -5);
  assert.equal(summary.netTakings, 280);
});
