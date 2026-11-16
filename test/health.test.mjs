/**
 * Tests for the two-tier health endpoint (issue #54).
 *
 * /healthz is public liveness only; /healthz/verbose (operational detail)
 * needs an X-Health-Token header. Helpers take their inputs as arguments so
 * tests don't depend on env or import order.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isHealthTokenValid, verboseHealth } from "../src/health.mjs";

test("valid token passes", () => {
  assert.equal(isHealthTokenValid("s3cret-token", "s3cret-token"), true);
});

test("wrong token of the same length fails", () => {
  assert.equal(isHealthTokenValid("s3cret-tokex", "s3cret-token"), false);
});

test("length mismatch fails without throwing", () => {
  assert.equal(isHealthTokenValid("short", "s3cret-token"), false);
  assert.equal(isHealthTokenValid("s3cret-token-and-more", "s3cret-token"), false);
});

test("missing header fails", () => {
  assert.equal(isHealthTokenValid(undefined, "s3cret-token"), false);
  assert.equal(isHealthTokenValid(["s3cret-token"], "s3cret-token"), false);
});

test("no configured token never matches", () => {
  assert.equal(isHealthTokenValid("anything", null), false);
  assert.equal(isHealthTokenValid("", ""), false);
  assert.equal(isHealthTokenValid("", undefined), false);
});

const NOW = Date.parse("2026-11-15T12:00:00Z");
const baseStatus = {
  mode: "replay",
  level: "WATCH",
  updatedAt: "2026-11-15T11:58:00Z",
  weather: { t: 1 },
  outlook: null,
  tropical: {},
};

test("verbose payload has the existing fields in order", () => {
  const out = verboseHealth({
    status: baseStatus, now: NOW, uptimeSeconds: 42, staleAfterSeconds: 180, persistenceBroken: true,
  });
  assert.deepEqual(out, {
    status: "ok",
    mode: "replay",
    level: "WATCH",
    updatedAt: "2026-11-15T11:58:00Z",
    dataAgeSeconds: 120,
    stale: false,
    uptimeSeconds: 42,
    hasWeather: true,
    hasOutlook: false,
    hasTropical: true,
    persistenceBroken: true,
  });
  assert.deepEqual(Object.keys(out), [
    "status", "mode", "level", "updatedAt", "dataAgeSeconds", "stale",
    "uptimeSeconds", "hasWeather", "hasOutlook", "hasTropical", "persistenceBroken",
  ]);
});

test("stale flips only past the threshold", () => {
  const at = (age) => verboseHealth({
    status: { ...baseStatus, updatedAt: new Date(NOW - age * 1000).toISOString() },
    now: NOW, uptimeSeconds: 1, staleAfterSeconds: 180, persistenceBroken: false,
  });
  assert.equal(at(180).stale, false);
  assert.equal(at(181).stale, true);
});

test("null updatedAt gives null age and not stale", () => {
  const out = verboseHealth({
    status: { ...baseStatus, updatedAt: null }, now: NOW, uptimeSeconds: 1, staleAfterSeconds: 180, persistenceBroken: false,
  });
  assert.equal(out.dataAgeSeconds, null);
  assert.equal(out.stale, false);
});
