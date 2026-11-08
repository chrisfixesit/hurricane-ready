/**
 * Tests for assets.mjs — static-asset preload + lookup.
 *
 * Issue #25: serving from disk on every request blocks the event loop and
 * mishandles query-string URLs. The preload pattern reads each allowlisted
 * file once at boot into a Map keyed by pathname, with a precomputed ETag.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadAssets, lookupAsset } from "../src/assets.mjs";

function tmpAssets() {
  const dir = mkdtempSync(path.join(tmpdir(), "hr-assets-"));
  mkdirSync(dir, { recursive: true });
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test("loadAssets reads every allowlisted file in the directory into memory", () => {
  const { dir, cleanup } = tmpAssets();
  try {
    writeFileSync(path.join(dir, "icon-192.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    writeFileSync(path.join(dir, "sw.js"), "self.addEventListener('install',()=>{});");
    writeFileSync(path.join(dir, "manifest.webmanifest"), JSON.stringify({ name: "x" }));
    writeFileSync(path.join(dir, "README.md"), "ignore me");

    const assets = loadAssets(dir);
    assert.equal(assets.size, 3, "only allowlisted extensions are loaded");
    assert.ok(assets.has("/icon-192.png"));
    assert.ok(assets.has("/sw.js"));
    assert.ok(assets.has("/manifest.webmanifest"));
    assert.ok(!assets.has("/README.md"), "README.md is not allowlisted");
  } finally { cleanup(); }
});

test("loadAssets entries carry buffer, contentType, cacheControl, and a stable ETag", () => {
  const { dir, cleanup } = tmpAssets();
  try {
    writeFileSync(path.join(dir, "icon-192.png"), Buffer.from("png-bytes"));
    writeFileSync(path.join(dir, "sw.js"), "code");

    const assets = loadAssets(dir);
    const icon = assets.get("/icon-192.png");
    assert.equal(icon.contentType, "image/png");
    assert.equal(icon.cacheControl, "public, max-age=86400");
    assert.equal(icon.buffer.toString(), "png-bytes");
    assert.ok(icon.etag && icon.etag.length > 4, "etag is set and non-trivial");

    const sw = assets.get("/sw.js");
    assert.equal(sw.contentType, "text/javascript; charset=utf-8");
    assert.equal(sw.cacheControl, "no-cache", "sw.js must NOT be cached long-term");
  } finally { cleanup(); }
});

test("loadAssets gives manifest.webmanifest the no-cache policy too", () => {
  const { dir, cleanup } = tmpAssets();
  try {
    writeFileSync(path.join(dir, "manifest.webmanifest"), "{}");
    const m = loadAssets(dir).get("/manifest.webmanifest");
    assert.equal(m.cacheControl, "no-cache");
    assert.equal(m.contentType, "application/manifest+json; charset=utf-8");
  } finally { cleanup(); }
});

test("lookupAsset strips query strings and hashes before matching", () => {
  const assets = new Map([
    ["/sw.js", { buffer: Buffer.from("code"), contentType: "text/javascript; charset=utf-8", cacheControl: "no-cache", etag: '"x"' }],
  ]);
  assert.ok(lookupAsset(assets, "/sw.js"));
  assert.ok(lookupAsset(assets, "/sw.js?v=42"), "query strings must not break lookup (issue #25)");
  assert.ok(lookupAsset(assets, "/sw.js#fragment"), "hashes must not break lookup");
  assert.equal(lookupAsset(assets, "/missing.png"), null);
});

test("lookupAsset rejects URLs that do NOT resolve to an allowlisted asset (defense vs path traversal)", () => {
  const assets = new Map([
    ["/icon-192.png", { buffer: Buffer.from("x"), contentType: "image/png", cacheControl: "public, max-age=86400", etag: '"a"' }],
  ]);
  assert.equal(lookupAsset(assets, "/../etc/passwd"), null);
  assert.equal(lookupAsset(assets, "/sub/icon-192.png"), null, "nested paths are not allowed");
});

test("loadAssets etags differ when content differs and match when content matches", () => {
  const a = tmpAssets();
  const b = tmpAssets();
  try {
    writeFileSync(path.join(a.dir, "icon-192.png"), Buffer.from("aaa"));
    writeFileSync(path.join(b.dir, "icon-192.png"), Buffer.from("aaa"));
    const ea = loadAssets(a.dir).get("/icon-192.png").etag;
    const eb = loadAssets(b.dir).get("/icon-192.png").etag;
    assert.equal(ea, eb, "same content → same etag");

    writeFileSync(path.join(b.dir, "icon-192.png"), Buffer.from("bbb"));
    const ec = loadAssets(b.dir).get("/icon-192.png").etag;
    assert.notEqual(ea, ec, "different content → different etag");
  } finally { a.cleanup(); b.cleanup(); }
});

test("loadAssets revalidates app.js on every load so a deploy reaches visitors at once", () => {
  // With a day-long max-age, CloudFront edges and browsers kept serving the
  // previous app.js for up to 24h after a Release (seen 2026-11-08: the CARTO
  // key fix was live but the Miami edge still served the watermarked map).
  // no-cache still lets them keep a copy — they just confirm the ETag (a 304).
  const { dir, cleanup } = tmpAssets();
  try {
    writeFileSync(path.join(dir, "app.js"), "code");
    writeFileSync(path.join(dir, "icon-192.png"), Buffer.from("png"));
    const assets = loadAssets(dir);
    assert.equal(assets.get("/app.js").cacheControl, "no-cache");
    assert.equal(assets.get("/icon-192.png").cacheControl, "public, max-age=86400", "icons still cache a day");
  } finally { cleanup(); }
});
