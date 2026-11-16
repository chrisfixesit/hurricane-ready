import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import path from "node:path";
import { rmSync, readFileSync } from "node:fs";
import webpush from "web-push";

// (#57) sendPushToAll prunes dead subscriptions. Separate file from push.test.mjs
// because that one runs with push disabled and module state is per-process.
const subsFile = path.join(tmpdir(), `hr-subs-prune-${process.pid}.json`);
const keys = webpush.generateVAPIDKeys();
process.env.DATA_DIR = tmpdir();
process.env.SUBS_FILE = subsFile;
process.env.VAPID_PUBLIC_KEY = keys.publicKey;
process.env.VAPID_PRIVATE_KEY = keys.privateKey;
process.env.PUSH_ALLOWED_HOSTS = "x";

const push = await import("../src/push.mjs");
const realSend = webpush.sendNotification;
test.after(() => { webpush.sendNotification = realSend; try { rmSync(subsFile); } catch { /* ignore */ } });

const sub = (n) => ({ endpoint: `https://x/${n}`, keys: { p256dh: "a", auth: "b" } });

test("sendPushToAll prunes 410 and 404 subscriptions and keeps the live one", async () => {
  assert.equal(push.pushEnabled, true);
  for (const n of ["gone", "missing", "alive"]) push.addSubscription(sub(n));
  const fail = { "https://x/gone": 410, "https://x/missing": 404 };
  webpush.sendNotification = async (s) => {
    if (fail[s.endpoint]) throw Object.assign(new Error("push failed"), { statusCode: fail[s.endpoint] });
    return { statusCode: 201 };
  };
  const r = await push.sendPushToAll({ title: "t", body: "b", level: "WARNING" });
  assert.equal(r.sent, 1);
  assert.equal(r.pruned, 2);
  assert.equal(push.subscriptionCount(), 1);
  const stored = JSON.parse(readFileSync(subsFile, "utf8"));
  assert.deepEqual(stored.map((x) => x.subscription.endpoint), ["https://x/alive"]);
});

test("other send errors (e.g. 500) do not prune", async () => {
  // Own fixture, so a focused run (--test-name-pattern) doesn't depend on the test above.
  const { unsubscribeToken } = push.addSubscription(sub("flaky"));
  const before = push.subscriptionCount();
  webpush.sendNotification = async () => { throw Object.assign(new Error("boom"), { statusCode: 500 }); };
  const r = await push.sendPushToAll({ title: "t", body: "b", level: "WARNING" });
  assert.equal(r.pruned, 0);
  assert.equal(push.subscriptionCount(), before);
  assert.equal(push.removeSubscription("https://x/flaky", unsubscribeToken).ok, true);
});
