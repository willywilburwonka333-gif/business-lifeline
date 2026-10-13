import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../../next.config";

test("production CSP permits Firebase auth, cloud sync, and OAuth helper frames", async () => {
  const groups = await nextConfig.headers?.();
  assert.ok(groups && groups.length > 0);
  const headers = groups[0].headers;
  const policy = headers.find(header => header.key === "Content-Security-Policy")?.value || "";
  const coop = headers.find(header => header.key === "Cross-Origin-Opener-Policy")?.value;
  assert.match(policy, /connect-src 'self'/);
  for (const endpoint of [
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://firestore.googleapis.com",
    "https://firebasestorage.googleapis.com",
  ]) {
    assert.ok(policy.includes(endpoint), `Missing Firebase network endpoint: ${endpoint}`);
  }
  assert.match(policy, /frame-src 'self' https:\/\/business-lifeline-au\.firebaseapp\.com/);
  assert.equal(coop, "same-origin-allow-popups");
  assert.match(policy, /default-src 'self'/);
});
