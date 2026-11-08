/**
 * Static asset preload (issue #25).
 *
 * Reads every allowlisted file in `web/` into memory once at boot and
 * precomputes an ETag per asset. The request handler does an O(1) Map lookup
 * keyed on the URL pathname (query strings + fragments stripped), so we no
 * longer block the event loop with a per-request `existsSync` + `readFileSync`
 * — and `/sw.js?v=…` cache-busted URLs now work correctly.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

// Service worker, manifest and app.js must update promptly (no-cache = keep a
// copy but revalidate the ETag each load, usually a 304); everything else
// caches a day. app.js changes on most deploys and Release doesn't invalidate
// CloudFront, so a day-long max-age left visitors on the old script.
const VOLATILE = new Set(["sw.js", "manifest.webmanifest", "app.js"]);

function etagOf(buffer) {
  const hash = createHash("sha256").update(buffer).digest("base64url");
  return `"${hash.slice(0, 16)}"`;
}

export function loadAssets(dir) {
  const out = new Map();
  for (const name of readdirSync(dir)) {
    const ext = path.extname(name);
    const type = TYPES[ext];
    if (!type) continue;
    const file = path.join(dir, name);
    if (!statSync(file).isFile()) continue;
    const buffer = readFileSync(file);
    out.set(`/${name}`, {
      buffer,
      contentType: type,
      cacheControl: VOLATILE.has(name) ? "no-cache" : "public, max-age=86400",
      etag: etagOf(buffer),
    });
  }
  return out;
}

export function lookupAsset(assets, rawUrl) {
  // Strip query and fragment so /sw.js?v=42 resolves the same as /sw.js.
  let p = rawUrl;
  const q = p.indexOf("?"); if (q >= 0) p = p.slice(0, q);
  const h = p.indexOf("#"); if (h >= 0) p = p.slice(0, h);
  // Allowlist by exact match to a known top-level pathname — no nesting,
  // no traversal, no decoding tricks.
  return assets.get(p) ?? null;
}
