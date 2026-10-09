import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const routes = ["analyse", "brain", "read-business-record", "read-spend-record"];
test("all provider-backed AI routes authenticate before processing requests", () => {
  for (const route of routes) {
    const body = read(`src/app/api/${route}/route.ts`);
    assert.match(body, /await requireAuthenticatedAiRequest\(request\)/, route);
    assert.ok(body.indexOf("await requireAuthenticatedAiRequest(request)") < body.indexOf("enforceRateLimit(request"), `${route} must authenticate before rate-limiting and AI use`);
  }
});
test("AI endpoints require verified Firebase tokens and client callers supply them", () => {
  const api = read("src/lib/api-security.ts");
  assert.match(api, /await requireFirebaseUser\(request\)/);
  assert.match(api, /status: 401/);
  for (const path of ["business-lifeline", "business-brain", "business-records", "lifeline-spend"]) {
    assert.match(read(`src/components/${path}.tsx`), /await authenticatedAiHeaders\(\)/, path);
  }
});

test("switching clients awaits IndexedDB deletion and refuses unbacked file loss", () => {
  const code = read("src/components/firebase-workspace.tsx");
  assert.match(code, /await clearVaultCache\(\)/);
  assert.match(code, /request\.onblocked = \(\) => reject/);
  assert.match(code, /if \(hasUnbackedVaultFiles\(\)\)/);
  const clear = code.slice(code.indexOf("const clearThisDevice = async"));
  assert.ok(clear.indexOf("await syncWorkspace(user)") < clear.indexOf("await clearLocalPayload()"));
  assert.match(clear, /await signOut\(firebaseAuth\)/);
  assert.match(code, /if \(!belongsToAccount\) await clearLocalPayload\(\)/);
});
