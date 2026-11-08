/* Bim Weather service worker: offline shell + cached status + push. */
// Bump on every deployment that changes any SHELL asset (#50). Without a
// bump, the activate handler below keeps the old cache and viewers see
// stale shell HTML until they clear storage. The matching client flow in
// index.html shows an "Update available" toast when a new SW is waiting.
const CACHE = "hr-cache-v9";
// app.js is precached with the page that needs it, so a new SW that activates
// offline still has the matching script.
const SHELL = [
  "/",
  "/index.html",
  "/app.js",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  // No skipWaiting here (#50): a new SW now waits until the client opts in
  // via the update toast (postMessage SKIP_WAITING), so mid-session users
  // are not forced onto a fresh controller without warning.
  // cache: "reload" skips the browser's HTTP cache, so the new SW stores the
  // files this deploy actually serves, not a copy from an older max-age.
  e.waitUntil(caches.open(CACHE).then((c) =>
    c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))));
});

// Client-driven activation. The client posts SKIP_WAITING after the user
// clicks the update toast; this is the explicit consent the install handler
// no longer assumes.
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

// Carry the last saved /api/status into the new cache before the old ones go,
// so a visitor who updates while offline still sees their last weather and
// threat level.
async function keepSavedStatus(oldKeys) {
  const cache = await caches.open(CACHE);
  if (await cache.match("/api/status")) return;
  for (const k of oldKeys) {
    const saved = await (await caches.open(k)).match("/api/status");
    if (saved) { await cache.put("/api/status", saved); return; }
  }
}

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const old = (await caches.keys()).filter((k) => k !== CACHE);
    await keepSavedStatus(old);
    await Promise.all(old.map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Saves a copy of a good response. The write is handed to e.waitUntil so the
// worker isn't stopped mid-write; a failed write is ignored, never replacing
// the network response the page already has.
function cacheCopy(req, res, e) {
  if (res && res.ok) {
    const copy = res.clone();
    e.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}));
  }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Live data: network-first so it's fresh online, last-saved when offline.
  if (url.pathname === "/api/status") {
    e.respondWith(fetch(req).then((r) => cacheCopy(req, r, e)).catch(() => caches.match(req)));
    return;
  }
  // Page navigations and app.js: network-first, so a deploy reaches open
  // clients (the server sends app.js no-cache, usually a cheap 304); fall back
  // to the cached copy offline. app.js has to move with the page that loads it.
  if (url.pathname === "/app.js") {
    // A 5xx from the origin or edge resolves rather than rejects, so fall back
    // to the cached script on any non-OK response too, not only when offline.
    const network = fetch(req)
      .then((r) => (r.ok ? cacheCopy(req, r, e) : caches.match(req).then((c) => c || r)))
      .catch(() => null);
    // Keep the worker alive until the network settles, so a slow fresh copy
    // still lands in the cache for next time even after we've answered.
    e.waitUntil(network);
    // On a slow connection (likely in a storm), don't hold the dashboard for
    // more than 3s: use the cached script then, if there is one.
    const slow = new Promise((res) => setTimeout(res, 3000))
      .then(() => caches.match(req))
      .then((c) => c || network);
    e.respondWith(
      Promise.race([network, slow])
        .then((r) => r || caches.match(req))
        .then((r) => r || Response.error())
    );
    return;
  }
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((r) => cacheCopy(req, r, e))
        .catch(() => caches.match(req).then((r) => r || caches.match("/index.html")))
    );
    return;
  }
  // Other same-origin assets: cache-first.
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then((c) => c || fetch(req).then((r) => cacheCopy(req, r, e))));
  }
  // Cross-origin (map tiles, satellite) fall through to the network.
});

self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = {}; }
  const title = data.title || "Bim Weather";
  const opts = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "hr-alert",
    renotify: true,
    requireInteraction: data.level === "WARNING" || data.level === "IMMINENT",
    data: { url: data.url || "/" },
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) { if ("focus" in w) return w.focus(); }
      return self.clients.openWindow(e.notification.data && e.notification.data.url || "/");
    })
  );
});
