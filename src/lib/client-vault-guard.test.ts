import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const code = readFileSync("src/components/firebase-workspace.tsx", "utf8");
test("all cache-clearing paths reject unbacked client documents by default", () => {
  assert.match(code, /async function clearLocalPayload\(options:/);
  assert.match(code, /if \(!options.allowUnbackedFiles && hasUnbackedVaultFiles\(\)\)/);
  assert.match(code, /if \(shouldRestore && cloudPayload\) \{\s*await clearLocalPayload\(\)/);
  assert.match(code, /if \(previousOwner !== nextUser.uid\)/);
  assert.match(code, /await clearLocalPayload\(\);/);
  assert.match(code, /await clearLocalPayload\(\{ allowUnbackedFiles: true \}\)/);
  assert.match(code, /error.message === UNBACKED_VAULT_NOTICE/);
});
