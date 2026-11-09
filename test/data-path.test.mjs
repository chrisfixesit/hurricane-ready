import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveDataPath } from "../src/storage.mjs";

// Issue #30: STATE_FILE / SUBS_FILE come from env. With a read-only root
// filesystem only /data and /tmp are writable, and /tmp is wiped with the
// task, so a path outside the data dir would silently lose state.

test("resolveDataPath: accepts a file inside the data dir", () => {
  assert.equal(resolveDataPath("STATE_FILE", "/data/state.json", "/data"), "/data/state.json");
  assert.equal(resolveDataPath("SUBS_FILE", "/data/sub/subs.json", "/data"), "/data/sub/subs.json");
});

test("resolveDataPath: normalises the path before checking", () => {
  assert.equal(resolveDataPath("STATE_FILE", "/data/./x/../state.json", "/data/"), "/data/state.json");
});

test("resolveDataPath: rejects paths outside the data dir", () => {
  for (const bad of ["/tmp/state.json", "/app/state.json", "/data/../etc/passwd", "/database/state.json"]) {
    assert.throws(() => resolveDataPath("STATE_FILE", bad, "/data"), /STATE_FILE.*\/data/, bad);
  }
});

test("resolveDataPath: rejects the data dir itself and relative paths", () => {
  assert.throws(() => resolveDataPath("SUBS_FILE", "/data", "/data"), /SUBS_FILE/);
  assert.throws(() => resolveDataPath("SUBS_FILE", "subs.json", "/data"), /SUBS_FILE/);
});

test("resolveDataPath: rejects a relative data dir", () => {
  assert.throws(() => resolveDataPath("STATE_FILE", "/data/state.json", "data"), /DATA_DIR/);
});
