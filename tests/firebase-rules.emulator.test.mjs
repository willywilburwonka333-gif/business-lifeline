import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getBytes } from "firebase/storage";

const environment = await initializeTestEnvironment({
  projectId: "demo-business-lifeline",
  firestore: { rules: readFileSync("firestore.rules", "utf8") },
  storage: { rules: readFileSync("storage.rules", "utf8") },
});
test.after(async () => environment.cleanup());

// The studio approval collection can only be changed with admin privileges.
// Owner/manager membership in a single company must not unlock studio modules.
await environment.withSecurityRulesDisabled(async context => {
  const db = context.firestore();
  for (const uid of ["alice", "staff", "accountant"]) {
    await setDoc(doc(db, "pilotAccess", uid), { tier: "full" });
  }
});

const alice = environment.authenticatedContext("alice");
const bob = environment.authenticatedContext("bob");
const staff = environment.authenticatedContext("staff");
const accountant = environment.authenticatedContext("accountant");
const outsider = environment.unauthenticatedContext();
const ownBusiness = "businesses/business-alice";

test("owner can bootstrap a new workspace, then read it", async () => {
  // The first get is denied by design: no owner document exists yet.
  await assertFails(getDoc(doc(alice.firestore(), ownBusiness)));
  await assertSucceeds(setDoc(doc(alice.firestore(), ownBusiness), {
    id: "business-alice", ownerId: "alice", name: "Alice business"
  }));
  await assertSucceeds(setDoc(doc(alice.firestore(), ownBusiness, "members", "alice"), {
    userId: "alice", role: "owner", status: "active"
  }));
  const own = await assertSucceeds(getDoc(doc(alice.firestore(), ownBusiness)));
  assert.equal(own.data()?.ownerId, "alice");
  await assertFails(getDoc(doc(bob.firestore(), ownBusiness)));
  await assertFails(getDoc(doc(outsider.firestore(), ownBusiness)));
});

test("only signed-in owner can access its workspace snapshot", async () => {
  const payload = { ownerId: "alice", payload: { diagnostic: "example only" } };
  await assertSucceeds(setDoc(doc(alice.firestore(), "userWorkspaces/alice"), payload));
  await assertSucceeds(getDoc(doc(alice.firestore(), "userWorkspaces/alice")));
  await assertFails(getDoc(doc(bob.firestore(), "userWorkspaces/alice")));
  await assertFails(setDoc(doc(bob.firestore(), "userWorkspaces/alice"), payload));
  await assertFails(getDoc(doc(outsider.firestore(), "userWorkspaces/alice")));
});

test("staff and accountant cannot bypass finance and payroll restrictions", async () => {
  await environment.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, ownBusiness, "members", "staff"), {
      userId: "staff", role: "staff", status: "active"
    });
    await setDoc(doc(db, ownBusiness, "members", "accountant"), {
      userId: "accountant", role: "accountant", status: "active"
    });
    await setDoc(doc(db, ownBusiness, "finance", "private"), { amount: 100 });
    await setDoc(doc(db, ownBusiness, "payroll", "private"), { amount: 200 });
    await setDoc(doc(db, ownBusiness, "records", "example"), {
      id: "example", type: "general", updatedBy: "alice"
    });
  });
  await assertSucceeds(getDoc(doc(alice.firestore(), ownBusiness, "finance", "private")));
  await assertSucceeds(getDoc(doc(alice.firestore(), ownBusiness, "payroll", "private")));
  await assertSucceeds(getDoc(doc(accountant.firestore(), ownBusiness, "finance", "private")));
  await assertFails(getDoc(doc(accountant.firestore(), ownBusiness, "payroll", "private")));
  await assertFails(getDoc(doc(staff.firestore(), ownBusiness, "finance", "private")));
  await assertFails(getDoc(doc(staff.firestore(), ownBusiness, "payroll", "private")));
  await assertSucceeds(getDoc(doc(staff.firestore(), ownBusiness, "records", "example")));
  await assertFails(getDoc(doc(bob.firestore(), ownBusiness, "records", "example")));
});

test("Storage vault only permits its own signed-in user", async () => {
  const aliceFile = ref(alice.storage(), "userVault/alice/demo-file.txt");
  await assertSucceeds(uploadBytes(aliceFile, new Uint8Array([72, 105]), {
    contentType: "text/plain"
  }));
  const read = await assertSucceeds(getBytes(aliceFile));
  assert.equal(read.byteLength, 2);
  await assertFails(getBytes(ref(bob.storage(), "userVault/alice/demo-file.txt")));
  await assertFails(uploadBytes(ref(bob.storage(), "userVault/alice/theft.txt"),
    new Uint8Array([1])));
  await assertFails(getBytes(ref(outsider.storage(), "userVault/alice/demo-file.txt")));
  await assertFails(uploadBytes(ref(alice.storage(), "businesses/business-alice/secret.txt"),
    new Uint8Array([1])));
});

test("client owns immutable MRI history; invited consultant cannot read operating data", async () => {
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), ownBusiness, "members", "consultant"), {
      userId: "consultant", role: "consultant", status: "active"
    });
    await setDoc(doc(context.firestore(), ownBusiness, "modules", "finance"), {
      module: "finance", payload: "private"
    });
  });
  const consultant = environment.authenticatedContext("consultant");
  const data = {
    id: "scan1", businessId: "business-alice", businessName: "Alice",
    createdAt: "2026-10-08T00:00:00Z", createdBy: "alice", saved: { data: {}, report: {} }
  };
  const path = `${ownBusiness}/mriReports/scan1`;
  await assertSucceeds(setDoc(doc(alice.firestore(), path), data));
  await assertSucceeds(getDoc(doc(alice.firestore(), path)));
  await assertSucceeds(getDoc(doc(consultant.firestore(), path)));
  await assertFails(getDoc(doc(bob.firestore(), path)));
  await assertFails(setDoc(doc(consultant.firestore(), `${ownBusiness}/mriReports/scan2`), {
    ...data, id: "scan2", createdBy: "consultant"
  }));
  await assertFails(setDoc(doc(alice.firestore(), path), {...data, businessName:"overwritten"}));
  await assertFails(getDoc(doc(consultant.firestore(), `${ownBusiness}/modules/finance`)));
  await assertFails(getDoc(doc(consultant.firestore(), `${ownBusiness}/finance/private`)));
  await assertFails(getDoc(doc(consultant.firestore(), `${ownBusiness}/records/example`)));
});


test("new pilot account cannot self-authorise full access or use advanced modules", async () => {
  const bobBusiness = "businesses/business-bob";
  await assertSucceeds(setDoc(doc(bob.firestore(), bobBusiness), {
    id: "business-bob", ownerId: "bob", name: "New pilot"
  }));
  await assertSucceeds(setDoc(doc(bob.firestore(), bobBusiness, "members", "bob"), {
    userId: "bob", role: "owner", status: "active"
  }));
  await assertSucceeds(setDoc(doc(bob.firestore(), "userWorkspaces/bob"), { ownerId: "bob", payload: { mri: "example" } }));
  await assertSucceeds(setDoc(doc(bob.firestore(), bobBusiness, "mriReports", "scan1"), {
    id: "scan1", businessId: "business-bob", businessName: "Pilot",
    createdAt: "2026-10-13T00:00:00Z", createdBy: "bob", saved: { data: {}, report: {} }
  }));
  await assertFails(setDoc(doc(bob.firestore(), "pilotAccess", "bob"), { tier: "full" }));
  await assertFails(setDoc(doc(bob.firestore(), bobBusiness, "modules", "finance"), { module: "finance", updatedBy: "bob" }));
  await assertFails(setDoc(doc(bob.firestore(), bobBusiness, "finance", "private"), { value: 2 }));
  await assertFails(setDoc(doc(bob.firestore(), bobBusiness, "payroll", "private"), { value: 2 }));
  await assertFails(setDoc(doc(bob.firestore(), bobBusiness, "crm", "contact"), { value: 2 }));
  await assertFails(setDoc(doc(bob.firestore(), bobBusiness, "records", "record"), { id: "record", type: "document", updatedBy: "bob" }));
  await assertFails(setDoc(doc(bob.firestore(), "businessInvites", "invite123"), {
    token: "invite123", businessId: "business-bob", role: "manager", status: "active"
  }));
});
