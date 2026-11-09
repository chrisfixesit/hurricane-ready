/**
 * Web Push notifications. Lets people opt in from the browser and get a push
 * the moment the threat level rises — no phone number, no account.
 *
 * Entirely optional: with no VAPID keys configured, push is disabled and the
 * subscribe endpoints report so. Subscriptions live on the writable /data
 * volume (the rest of the container filesystem is read-only).
 */
import webpush from "web-push";
import { writeJsonAtomic, readJsonSafe } from "./storage.mjs";
import { config } from "./config.mjs";
import { isAllowedPushEndpoint } from "./endpoint.mjs";
import { computeUnsubscribeToken, unsubscribeTokenMatches } from "./unsubscribe-token.mjs";
import { mapWithConcurrency } from "./concurrency.mjs";

// Cap concurrent webpush sends (#56). Prior Promise.all(subs.map(...)) fired
// up to MAX_SUBSCRIPTIONS (50,000) HTTPS requests concurrently — sockets
// exhausted, SDK OOM'd, watcher tick blocked until the slowest. 50 is a
// sensible default for a 256-CPU Fargate task; override per deployment.
const PUSH_CONCURRENCY = Math.max(1, Number(process.env.PUSH_CONCURRENCY || 50));

const PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
const PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:alerts@hurricane-ready.local";
// Unsubscribe token secret (#18). Derived from VAPID_PRIVATE_KEY by default
// (already a long-lived server secret); override with UNSUBSCRIBE_SECRET to
// rotate independently. Tokens minted with the prior secret stop verifying
// the moment this value changes — that's the intended escape hatch.
const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || PRIVATE;

export const pushEnabled = Boolean(PUBLIC && PRIVATE);
if (pushEnabled) {
  try {
    webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
  } catch (err) {
    console.warn(`Push disabled: bad VAPID config (${err.message})`);
  }
}

const SUBS_FILE = config.subsFile;

// Push-endpoint allowlist (issue #17). Defaults cover the known production
// push services; override via PUSH_ALLOWED_HOSTS (comma-separated). A leading
// "." matches subdomains only — see endpoint.mjs.
const DEFAULT_ALLOWED_HOSTS = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
  ".notify.windows.com",
];
const ALLOWED_HOSTS = (process.env.PUSH_ALLOWED_HOSTS ?? DEFAULT_ALLOWED_HOSTS.join(","))
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const LEVEL_RANK = { ALL_CLEAR: 0, WATCH: 1, WARNING: 2, IMMINENT: 3 };
// `Object.hasOwn` instead of `in` (#44): the latter walks the prototype chain,
// so `"__proto__" in LEVEL_RANK` is true and a client passing minLevel:
// "__proto__" would bypass the rank gate entirely (LEVEL_RANK["__proto__"]
// is undefined → comparisons against undefined are always false → every push
// goes through regardless of the subscriber's chosen minimum level).
export const normLevel = (l) => (Object.hasOwn(LEVEL_RANK, l) ? l : "WATCH");

// Each stored record: { subscription, minLevel, quiet }.
// Migrates older records that were just a raw PushSubscription.
function load() {
  const parsed = readJsonSafe(SUBS_FILE, null, {
    onError: (err) => console.warn(`subscriptions.json is corrupt, starting clean: ${err.message}`),
  });
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((r) => (r && r.subscription ? r : { subscription: r, minLevel: "WATCH", quiet: false }))
    .filter((r) => r.subscription && typeof r.subscription.endpoint === "string");
}

let subs = load();

function save() {
  try {
    writeJsonAtomic(SUBS_FILE, subs);
  } catch (err) {
    console.warn(`Could not persist subscriptions: ${err.message}`);
  }
}

export const vapidPublicKey = () => (pushEnabled ? PUBLIC : null);
export const subscriptionCount = () => subs.length;

const MAX_SUBS = Number(process.env.MAX_SUBSCRIPTIONS || 50000);

// Barbados is AST (UTC-4, no DST). Overnight quiet window: 22:00–07:00.
function barbadosNight(d = new Date()) {
  const h = (d.getUTCHours() - 4 + 24) % 24;
  return h >= 22 || h < 7;
}

export function addSubscription(sub, prefs = {}) {
  // Require a well-formed PushSubscription (endpoint + encryption keys).
  if (!sub || typeof sub.endpoint !== "string" || !sub.keys ||
      typeof sub.keys.p256dh !== "string" || typeof sub.keys.auth !== "string") {
    return null;
  }
  // Endpoint must point at a known push service over https — no raw IPs, no
  // attacker-controlled URLs (issue #17, SSRF defense).
  if (!isAllowedPushEndpoint(sub.endpoint, ALLOWED_HOSTS)) return null;
  const record = {
    subscription: sub,
    minLevel: normLevel(prefs.minLevel),
    quiet: Boolean(prefs.quiet),
  };
  const existing = subs.find((r) => r.subscription.endpoint === sub.endpoint);
  if (existing) {
    existing.minLevel = record.minLevel;
    existing.quiet = record.quiet;
    save();
    return { unsubscribeToken: computeUnsubscribeToken(sub.endpoint, UNSUBSCRIBE_SECRET) };
  }
  if (subs.length >= MAX_SUBS) return null; // bound storage growth
  subs.push(record);
  save();
  // Token is deterministic from (endpoint, secret) so we recompute on every
  // unsubscribe attempt — no need to persist it per-record (#18).
  return { unsubscribeToken: computeUnsubscribeToken(sub.endpoint, UNSUBSCRIBE_SECRET) };
}

export function removeSubscription(endpoint, submittedToken) {
  // Ownership check (#18): require the HMAC token the server issued at
  // subscribe time. Anyone who learns an endpoint URL (via SSRF, leaked
  // log, browser memory dump) can no longer silently mute that subscriber.
  if (!unsubscribeTokenMatches(endpoint, UNSUBSCRIBE_SECRET, submittedToken)) {
    return { ok: false, reason: "token" };
  }
  const before = subs.length;
  subs = subs.filter((r) => r.subscription.endpoint !== endpoint);
  const removed = subs.length !== before;
  if (removed) save();
  return { ok: removed, reason: removed ? null : "not-found" };
}

// Should this subscriber get a push for `level`?  Honour their minimum level;
// overnight-quiet suppresses only WATCH (Warning/Imminent always go through);
// the ALL_CLEAR stand-down goes to everyone (but still respects quiet).
function wants(rec, level) {
  if (level === "ALL_CLEAR") return !(rec.quiet && barbadosNight());
  if (LEVEL_RANK[level] < LEVEL_RANK[rec.minLevel]) return false;
  if (rec.quiet && level === "WATCH" && barbadosNight()) return false;
  return true;
}

// Fan out one notification to matching subscribers. Expired subscriptions
// (410 Gone / 404) are pruned so the list self-heals. Concurrency is capped
// at PUSH_CONCURRENCY (#56) — prior unbounded fan-out exhausted sockets at
// even a few thousand subscribers and blocked the watcher tick.
export async function sendPushToAll(payload) {
  const level = normLevel(payload && payload.level);
  if (!pushEnabled || subs.length === 0) return { sent: 0, pruned: 0, skipped: 0 };
  const body = JSON.stringify(payload);
  const dead = [];
  let sent = 0, skipped = 0;
  await mapWithConcurrency(subs, PUSH_CONCURRENCY, async (rec) => {
    if (!wants(rec, level)) { skipped += 1; return; }
    try {
      await webpush.sendNotification(rec.subscription, body, { TTL: 3600, urgency: "high" });
      sent += 1;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) dead.push(rec.subscription.endpoint);
      else console.warn(`Push send failed (${err.statusCode || err.message})`);
    }
  });
  if (dead.length) {
    subs = subs.filter((r) => !dead.includes(r.subscription.endpoint));
    save();
  }
  return { sent, pruned: dead.length, skipped };
}
