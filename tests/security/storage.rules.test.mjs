import { after, before, test } from "node:test";
import { readFile } from "node:fs/promises";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage";

const projectId = "business-lifeline-storage-rules-test";
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    storage: { rules: await readFile("storage.rules", "utf8") },
  });
});

after(async () => {
  await env.cleanup();
});

const storageFor = (uid) => env.authenticatedContext(uid, { email: `${uid}@example.test` }).storage();

test("owner can upload, read and delete their vault file", async () => {
  const file = ref(storageFor("owner"), "userVault/owner/test/file.txt");
  await assertSucceeds(uploadBytes(file, new TextEncoder().encode("safe beta file")));
  await assertSucceeds(getBytes(file));
  await assertSucceeds(deleteObject(file));
});

test("another account cannot read or overwrite an owner's file", async () => {
  const ownerFile = ref(storageFor("owner"), "userVault/owner/test/private.txt");
  await assertSucceeds(uploadBytes(ownerFile, new TextEncoder().encode("private")));
  const outsiderFile = ref(storageFor("outsider"), "userVault/owner/test/private.txt");
  await assertFails(getBytes(outsiderFile));
  await assertFails(uploadBytes(outsiderFile, new TextEncoder().encode("overwrite")));
});

test("unauthenticated and unapproved paths are denied", async () => {
  const unauthenticated = env.unauthenticatedContext().storage();
  await assertFails(uploadBytes(ref(unauthenticated, "userVault/anonymous/file.txt"), new Uint8Array([1])));
  await assertFails(uploadBytes(ref(storageFor("owner"), "businesses/alpha/file.txt"), new Uint8Array([1])));
});

test("files over the 25 MB beta limit are denied", async () => {
  const tooLarge = new Uint8Array(25 * 1024 * 1024 + 1);
  await assertFails(uploadBytes(ref(storageFor("owner"), "userVault/owner/test/too-large.bin"), tooLarge));
});
