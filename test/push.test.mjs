import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import path from "node:path";
import { rmSync } from "node:fs";

// Isolate the subscription store to a temp file BEFORE importing the module.
const subsFile = path.join(tmpdir(), `hr-subs-${process.pid}.json`);
process.env.DATA_DIR = tmpdir();
process.env.SUBS_FILE = subsFile;
delete process.env.VAPID_PUBLIC_KEY;
delete process.env.VAPID_PRIVATE_KEY;
// Test fixture endpoints use the host "x" — pin the allowlist to match so the
// existing add/remove tests still exercise valid endpoints.
process.env.PUSH_ALLOWED_HOSTS = "x";
// Fixed secret so unsubscribe-token tests are deterministic.
process.env.UNSUBSCRIBE_SECRET = "test-secret";

const push = await import("../src/push.mjs");

test.after(() => { try { rmSync(subsFile); } catch { /* ignore */ } });

test("push disabled without VAPID keys", () => {
  assert.equal(push.pushEnabled, false);
  assert.equal(push.vapidPublicKey(), null);
});

const sub = (n) => ({ endpoint: `https://x/${n}`, keys: { p256dh: "a", auth: "b" } });

// Capture tokens for use in unsubscribe tests below.
const tokens = {};

test("add/remove subscriptions, de-duplicated by endpoint", () => {
  assert.equal(push.subscriptionCount(), 0);
  const r1 = push.addSubscription(sub(1));
  assert.ok(r1 && typeof r1.unsubscribeToken === "string", "addSubscription returns a token (issue #18)");
  tokens.s1 = r1.unsubscribeToken;
  push.addSubscription(sub(1)); // duplicate; updates prefs
  const r2 = push.addSubscription(sub(2));
  tokens.s2 = r2.unsubscribeToken;
  assert.equal(push.subscriptionCount(), 2);
  const removed1 = push.removeSubscription("https://x/1", tokens.s1);
  assert.deepEqual(removed1, { ok: true, reason: null });
  assert.equal(push.subscriptionCount(), 1);
});

test("addSubscription rejects malformed input (returns null instead of a token)", () => {
  assert.equal(push.addSubscription(null), null);
  assert.equal(push.addSubscription({}), null);
  assert.equal(push.addSubscription({ endpoint: "https://x/9" }), null); // no keys
});

test("addSubscription rejects endpoints whose host is not in the allowlist (issue #17)", () => {
  const bad = { endpoint: "https://attacker.example.com/push", keys: { p256dh: "a", auth: "b" } };
  assert.equal(push.addSubscription(bad), null);
});

test("addSubscription rejects raw IP endpoints (defense vs SSRF)", () => {
  const ip = { endpoint: "https://169.254.169.254/iam/", keys: { p256dh: "a", auth: "b" } };
  assert.equal(push.addSubscription(ip), null);
});

test("addSubscription rejects http:// endpoints (https only)", () => {
  const cleartext = { endpoint: "http://x/insecure", keys: { p256dh: "a", auth: "b" } };
  assert.equal(push.addSubscription(cleartext), null);
});

test("removeSubscription requires the unsubscribe token (issue #18)", () => {
  // From earlier tests, https://x/2 is still subscribed; tokens.s2 was issued for it.
  // Wrong token → 'token' reason, no removal.
  assert.deepEqual(
    push.removeSubscription("https://x/2", "wrong-token"),
    { ok: false, reason: "token" },
  );
  assert.equal(push.subscriptionCount(), 1, "wrong-token attempt must NOT remove the subscription");
  // No token at all → still rejected.
  assert.deepEqual(
    push.removeSubscription("https://x/2", undefined),
    { ok: false, reason: "token" },
  );
  // Correct token → removed.
  assert.deepEqual(
    push.removeSubscription("https://x/2", tokens.s2),
    { ok: true, reason: null },
  );
  assert.equal(push.subscriptionCount(), 0);
});

test("removeSubscription with the right token but an absent endpoint reports not-found", () => {
  // Compute a valid token for an endpoint that was never subscribed.
  const fresh = push.addSubscription(sub(99));
  push.removeSubscription("https://x/99", fresh.unsubscribeToken); // removed
  // Now retry — endpoint is gone but the token is still valid (deterministic).
  assert.deepEqual(
    push.removeSubscription("https://x/99", fresh.unsubscribeToken),
    { ok: false, reason: "not-found" },
  );
});

test("sendPushToAll is a no-op when push is disabled", async () => {
  const r = await push.sendPushToAll({ title: "t", body: "b", level: "WATCH" });
  assert.equal(r.sent, 0);
  assert.equal(r.pruned, 0);
});

test("normLevel falls back to WATCH for inherited-prototype keys (issue #44)", () => {
  // The old `(l in LEVEL_RANK)` check returned true for any Object.prototype
  // key, so a client could set minLevel: "__proto__" and bypass the rank gate
  // (LEVEL_RANK["__proto__"] is undefined, comparisons against undefined are
  // always false, so wants() returned true regardless of level). Object.hasOwn
  // is the correct check.
  assert.equal(push.normLevel("__proto__"), "WATCH", "__proto__ must not bypass the level gate");
  assert.equal(push.normLevel("constructor"), "WATCH", "constructor must not bypass either");
  assert.equal(push.normLevel("hasOwnProperty"), "WATCH");
  assert.equal(push.normLevel("toString"), "WATCH");
});

test("normLevel accepts real levels and falls back on unknown strings", () => {
  for (const real of ["ALL_CLEAR", "WATCH", "WARNING", "IMMINENT"]) {
    assert.equal(push.normLevel(real), real);
  }
  assert.equal(push.normLevel("not-a-level"), "WATCH");
  assert.equal(push.normLevel(undefined), "WATCH");
  assert.equal(push.normLevel(null), "WATCH");
});
