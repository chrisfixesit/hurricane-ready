import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:8080";

// (#57) Push subscribe e2e. No VAPID keys or extra server needed: /api/subscribe
// and /api/unsubscribe don't depend on them (only the UI opt-in does, so the
// browser test stubs /api/vapidPublicKey). Run: BASE_URL=... npx playwright test push
// Endpoints use fcm.googleapis.com, on the server's default allowlist; each is
// unsubscribed at the end, so the server's store is left as found.
test.describe.configure({ mode: "serial" }); // subscribe is rate-limited to 5/min/IP; keep calls few
test.skip(({ browserName }) => browserName !== "chromium", "PushManager stub + notification grant are Chromium-only");

const ep = () => `https://fcm.googleapis.com/fcm/send/e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const fake = (endpoint) => ({ endpoint, keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } });

test("(#57) /api/subscribe returns 201 + token; unsubscribe removes it", async ({ request }) => {
  const endpoint = ep();
  const sub = await request.post(BASE + "/api/subscribe", { data: { subscription: fake(endpoint), minLevel: "WARNING", quiet: true } });
  expect(sub.status()).toBe(201);
  const { ok, unsubscribeToken } = await sub.json();
  expect(ok).toBe(true);
  expect(unsubscribeToken).toBeTruthy();
  // Wrong token is refused and leaves it in place.
  const bad = await request.post(BASE + "/api/unsubscribe", { data: { endpoint, unsubscribeToken: "nope" } });
  expect(bad.status()).toBe(403);
  const del = await request.post(BASE + "/api/unsubscribe", { data: { endpoint, unsubscribeToken } });
  expect(del.status()).toBe(200);
  expect((await del.json()).ok).toBe(true);
  // Removed: a second unsubscribe with the valid token reports not-found.
  const gone = await request.post(BASE + "/api/unsubscribe", { data: { endpoint, unsubscribeToken } });
  expect(gone.status()).toBe(404);
});

test("(#57) /api/subscribe rejects endpoints off the allowlist", async ({ request }) => {
  const evil = await request.post(BASE + "/api/subscribe", { data: { subscription: fake("https://attacker.example.com/push") } });
  expect(evil.status()).toBe(400);
});

test("(#57) clicking 'Get storm alerts' subscribes and POSTs to /api/subscribe", async ({ page, context, request }) => {
  await context.grantPermissions(["notifications"], { origin: new URL(BASE).origin });
  const endpoint = ep();
  // The opt-in only appears when the server has a VAPID key; hand the page one.
  await page.route("**/api/vapidPublicKey", (r) => r.fulfill({ json: { key: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM" } }));
  await page.addInitScript((sub) => {
    const s = { ...sub, unsubscribe: async () => true, toJSON: () => sub };
    // Headless Chromium reports "denied" even after grantPermissions, so pin it too.
    Object.defineProperty(Notification, "permission", { get: () => "granted" });
    Notification.requestPermission = async () => "granted";
    PushManager.prototype.subscribe = async () => s;
    PushManager.prototype.getSubscription = async () => null;
  }, { ...fake(endpoint), expirationTime: null });
  await page.goto(BASE, { waitUntil: "load" });
  const btn = page.locator("#alerts-btn");
  // setState rewrites the copy just before the click handler is wired
  await expect(page.locator("#alerts-text")).toContainText("Get a push", { timeout: 15000 });
  const [req, res] = await Promise.all([
    page.waitForRequest((r) => r.url().endsWith("/api/subscribe") && r.method() === "POST"),
    page.waitForResponse((r) => r.url().endsWith("/api/subscribe")),
    btn.click(),
  ]);
  expect(req.postDataJSON().subscription.endpoint).toBe(endpoint);
  expect(res.status()).toBe(201);
  await expect(btn).toHaveText("Turn off");
  // Clean up the stored subscription.
  const { unsubscribeToken } = await res.json();
  expect((await request.post(BASE + "/api/unsubscribe", { data: { endpoint, unsubscribeToken } })).status()).toBe(200);
});
