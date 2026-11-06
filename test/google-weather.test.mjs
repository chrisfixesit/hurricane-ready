import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchGoogleHourly, mergeHourly, _resetGoogleCache } from "../src/google-weather.mjs";

const island = { lat: 13.19, lon: -59.54 };

// Trimmed shape of a real forecast/hours:lookup response (2026-11-06).
const hour = (start, rain, thunder, qpf = 0) => ({
  interval: { startTime: start, endTime: start },
  precipitation: { probability: { type: "RAIN", percent: rain }, qpf: { unit: "MILLIMETERS", quantity: qpf } },
  thunderstormProbability: thunder,
});
const googleBody = {
  forecastHours: [
    hour("2026-11-06T16:00:00Z", 50, 70, 0.8),
    hour("2026-11-06T17:00:00Z", 40, 70, 0.7),
    hour("2026-11-06T18:00:00Z", 25, 70, 0.2),
  ],
};

const okFetch = (body) => {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    return { ok: true, status: 200, json: async () => body };
  };
  fn.calls = calls;
  return fn;
};

test("no key → null, and no request is made", async () => {
  _resetGoogleCache();
  const f = okFetch(googleBody);
  assert.equal(await fetchGoogleHourly(island, "", { fetchImpl: f }), null);
  assert.equal(f.calls.length, 0);
});

test("parses hours keyed by UTC start time", async () => {
  _resetGoogleCache();
  const byHour = await fetchGoogleHourly(island, "k", { fetchImpl: okFetch(googleBody) });
  assert.equal(byHour.size, 3);
  assert.deepEqual(byHour.get(Date.parse("2026-11-06T16:00:00Z")), { rainProb: 50, thunderProb: 70 });
});

test("caches for the TTL so 15-minute polls don't each bill a call", async () => {
  _resetGoogleCache();
  const f = okFetch(googleBody);
  let now = 1_000_000;
  await fetchGoogleHourly(island, "k", { fetchImpl: f, now: () => now });
  now += 45 * 60_000;
  await fetchGoogleHourly(island, "k", { fetchImpl: f, now: () => now });
  assert.equal(f.calls.length, 1);
  now += 16 * 60_000; // past 60 min
  await fetchGoogleHourly(island, "k", { fetchImpl: f, now: () => now });
  assert.equal(f.calls.length, 2);
});

test("HTTP error → null (panel falls back to Open-Meteo)", async () => {
  _resetGoogleCache();
  const f = async () => ({ ok: false, status: 404, json: async () => ({}) });
  assert.equal(await fetchGoogleHourly(island, "k", { fetchImpl: f }), null);
});

test("network error → null", async () => {
  _resetGoogleCache();
  const f = async () => { throw new Error("boom"); };
  assert.equal(await fetchGoogleHourly(island, "k", { fetchImpl: f }), null);
});

test("never leaks the key into logs on failure", async () => {
  _resetGoogleCache();
  const logged = [];
  const orig = console.warn;
  console.warn = (...a) => logged.push(a.join(" "));
  try {
    await fetchGoogleHourly(island, "SECRET123", { fetchImpl: async () => { throw new Error("x"); } });
  } finally {
    console.warn = orig;
  }
  assert.ok(logged.length > 0);
  assert.ok(!logged.join("").includes("SECRET123"));
});

// Open-Meteo hours are naive local times; the caller supplies the converter.
const toUtcMs = (t) => Date.parse(t + "Z") + 4 * 3600_000; // AST = UTC-4
const omHours = [
  { time: "2026-11-06T12:00", rainProb: 5, precipMm: 1.5 },
  { time: "2026-11-06T13:00", rainProb: 11, precipMm: 1.3 },
  { time: "2026-11-06T15:00", rainProb: 12, precipMm: 0 }, // Google has no 19:00Z
];

test("merge: Google rain/thunder chance overrides per matched hour, mm stays Open-Meteo", async () => {
  _resetGoogleCache();
  const g = await fetchGoogleHourly(island, "k", { fetchImpl: okFetch(googleBody) });
  const { hourly, rainSource } = mergeHourly(omHours, toUtcMs, g);
  assert.equal(rainSource, "google");
  assert.deepEqual(hourly[0], { time: "2026-11-06T12:00", rainProb: 50, thunderProb: 70, precipMm: 1.5 });
  assert.equal(hourly[1].rainProb, 40);
  // unmatched hour keeps Open-Meteo's chance, no thunder figure
  assert.equal(hourly[2].rainProb, 12);
  assert.equal(hourly[2].thunderProb, null);
});

test("merge: no Google data → unchanged values, source open-meteo", () => {
  const { hourly, rainSource } = mergeHourly(omHours, toUtcMs, null);
  assert.equal(rainSource, "open-meteo");
  assert.equal(hourly[0].rainProb, 5);
  assert.equal(hourly[0].thunderProb, null);
});
