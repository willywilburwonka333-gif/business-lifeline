import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { readFile } from "node:fs/promises";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const projectId = "business-lifeline-rules-test";
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await readFile("firestore.rules", "utf8") },
  });
});

after(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "businesses", "alpha"), { id: "alpha", ownerId: "owner" });
    await setDoc(doc(db, "businesses", "alpha", "members", "owner"), { userId: "owner", role: "owner", status: "active" });
    await setDoc(doc(db, "businesses", "alpha", "members", "manager"), { userId: "manager", role: "manager", status: "active" });
    await setDoc(doc(db, "businesses", "alpha", "members", "staff"), { userId: "staff", role: "staff", status: "active" });
    await setDoc(doc(db, "businesses", "alpha", "members", "accountant"), { userId: "accountant", role: "accountant", status: "active" });
    await setDoc(doc(db, "businesses", "alpha", "records", "customers_1"), { type: "customers", recordId: "1", payload: { id: "1", name: "Test customer" } });
  });
});

const dbFor = (uid, email = `${uid}@example.test`) => env.authenticatedContext(uid, { email }).firestore();

test("members can read their business and outsiders cannot", async () => {
  await assertSucceeds(getDoc(doc(dbFor("owner"), "businesses", "alpha")));
  await assertSucceeds(getDoc(doc(dbFor("staff"), "businesses", "alpha", "records", "customers_1")));
  await assertFails(getDoc(doc(dbFor("outsider"), "businesses", "alpha")));
});

test("staff can write operating records but accountant cannot", async () => {
  await assertSucceeds(setDoc(doc(dbFor("staff"), "businesses", "alpha", "records", "products_2"), {
    type: "products", recordId: "2", payload: { id: "2", name: "Service" },
  }));
  await assertFails(setDoc(doc(dbFor("accountant"), "businesses", "alpha", "records", "products_3"), {
    type: "products", recordId: "3", payload: { id: "3", name: "Blocked" },
  }));
});

test("only owner can remove a member and nobody can promote to owner", async () => {
  await assertFails(updateDoc(doc(dbFor("manager"), "businesses", "alpha", "members", "staff"), { role: "owner" }));
  await assertSucceeds(deleteDoc(doc(dbFor("owner"), "businesses", "alpha", "members", "staff")));
});

test("removed membership immediately removes business access", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await deleteDoc(doc(context.firestore(), "businesses", "alpha", "members", "staff"));
  });
  await assertFails(getDoc(doc(dbFor("staff"), "businesses", "alpha", "records", "customers_1")));
});

test("unknown top-level collections remain denied", async () => {
  await assertFails(setDoc(doc(dbFor("owner"), "privateAdmin", "config"), { enabled: true }));
  const denied = await getDoc(doc(dbFor("owner"), "privateAdmin", "config")).then(() => false, () => true);
  assert.equal(denied, true);
});
