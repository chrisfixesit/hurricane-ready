/* Bim Weather service worker: offline shell + cached status + push. */
// Bump on every deployment that changes any SHELL asset (#50). Without a
// bump, the activate handler below keeps the old cache and viewers see
// stale shell HTML until they clear storage. The matching client flow in
// index.html shows an "Update available" toast when a new SW is waiting.
const CACHE = "hr-cache-v8";
const SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  // No skipWaiting here (#50): a new SW now waits until the client opts in
  // via the update toast (postMessage SKIP_WAITING), so mid-session users
  // are not forced onto a fresh controller without warning.
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
});

// Client-driven activation. The client posts SKIP_WAITING after the user
// clicks the update toast; this is the explicit consent the install handler
// no longer assumes.
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function cacheCopy(req, res) {
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Live data: network-first so it's fresh online, last-saved when offline.
  if (url.pathname === "/api/status") {
    e.respondWith(fetch(req).then((r) => cacheCopy(req, r)).catch(() => caches.match(req)));
    return;
  }
  // Page navigations: network-first, fall back to the cached shell offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((r) => cacheCopy(req, r))
        .catch(() => caches.match(req).then((r) => r || caches.match("/index.html")))
    );
    return;
  }
  // Other same-origin assets: cache-first.
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then((c) => c || fetch(req).then((r) => cacheCopy(req, r))));
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
