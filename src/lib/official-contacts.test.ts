import assert from "node:assert/strict";
import test from "node:test";
import { BUSINESS, LEGAL_DOCUMENTS } from "./legal-content.ts";

test("public business contact addresses use the verified custom domain", () => {
  assert.equal(BUSINESS.supportEmail, "support@businesslifeline.com.au");
  assert.equal(BUSINESS.mainEmail, "dylan@businesslifeline.com.au");
});

test("support, privacy, and security contact information in legal documents uses the public inbox", () => {
  const support = LEGAL_DOCUMENTS.support;
  assert.ok(support);
  const text = JSON.stringify(LEGAL_DOCUMENTS);
  assert.ok(text.includes(BUSINESS.supportEmail));
  assert.ok(!text.includes("businesslifelinesupport@gmail.com"));
});
