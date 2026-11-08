import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchGoogleHourly, mergeHourly, fetchGoogleDaily, mergeDaily, _resetGoogleCache } from "../src/google-weather.mjs";

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

test("backs off for 10 minutes after a failure, then retries", async () => {
  _resetGoogleCache();
  let calls = 0;
  let fail = true;
  const f = async () => {
    calls++;
    if (fail) throw new Error("timeout");
    return { ok: true, status: 200, json: async () => googleBody };
  };
  let now = 5_000_000;
  const opts = { fetchImpl: f, now: () => now };
  assert.equal(await fetchGoogleHourly(island, "k", opts), null);
  now += 9 * 60_000;
  assert.equal(await fetchGoogleHourly(island, "k", opts), null);
  assert.equal(calls, 1, "no retry inside the backoff window");
  fail = false;
  now += 2 * 60_000;
  assert.ok(await fetchGoogleHourly(island, "k", opts));
  assert.equal(calls, 2);
});

test("out-of-contract probabilities are treated as missing", async () => {
  _resetGoogleCache();
  const body = { forecastHours: [
    hour("2026-11-06T16:00:00Z", 150, -3),
    hour("2026-11-06T17:00:00Z", 40.5, "70"),
  ] };
  const g = await fetchGoogleHourly(island, "k", { fetchImpl: okFetch(body) });
  assert.deepEqual(g.get(Date.parse("2026-11-06T16:00:00Z")), { rainProb: null, thunderProb: null });
  assert.deepEqual(g.get(Date.parse("2026-11-06T17:00:00Z")), { rainProb: null, thunderProb: null });
  // and the merge keeps Open-Meteo's value for those hours
  const { hourly, rainSource } = mergeHourly(omHours, toUtcMs, g);
  assert.equal(hourly[0].rainProb, 5);
  assert.equal(rainSource, "open-meteo");
});

// ---- through fetchOutlook, with Open-Meteo and Google both stubbed ----

import { fetchOutlook } from "../src/weather.mjs";

function stubFetch({ googleOk }) {
  // Build an Open-Meteo forecast whose hourly series starts at the current
  // UTC hour, so the strip and Google's hours line up the way they do live.
  const start = Math.floor(Date.now() / 3600_000) * 3600_000;
  const iso = (ms) => new Date(ms).toISOString().slice(0, 13) + ":00"; // naive, offset 0
  const times = Array.from({ length: 24 }, (_, i) => iso(start + i * 3600_000));
  const forecast = {
    utc_offset_seconds: 0,
    daily: { time: ["2026-11-06"], weather_code: [80], temperature_2m_max: [30], temperature_2m_min: [25],
      precipitation_probability_max: [20], wind_speed_10m_max: [20], uv_index_max: [9],
      sunrise: ["x"], sunset: ["y"], daylight_duration: [43000] },
    hourly: { time: times, precipitation_probability: times.map(() => 5), precipitation: times.map(() => 1),
      wind_speed_10m: times.map(() => 20), wind_gusts_10m: times.map(() => 30),
      weather_code: times.map(() => 80), uv_index: times.map(() => 1) },
  };
  const google = { forecastHours: [hour(new Date(start).toISOString(), 60, 45)] };
  const googleDays = { forecastDays: [day("2026-11-06", 35, 70, 10, 40)] };
  return async (url) => {
    const u = String(url);
    if (u.includes("weather.googleapis.com")) {
      if (!googleOk) throw new Error("down");
      const body = u.includes("days:lookup") ? googleDays : google;
      return { ok: true, status: 200, json: async () => body };
    }
    if (u.includes("api.open-meteo.com")) return { ok: true, status: 200, json: async () => forecast };
    return { ok: false, status: 503, json: async () => ({}) }; // marine/air: not under test
  };
}

async function withFetch(fn, impl) {
  const orig = globalThis.fetch;
  const warn = console.warn;
  globalThis.fetch = impl;
  console.warn = () => {};
  try { return await fn(); } finally { globalThis.fetch = orig; console.warn = warn; }
}

test("fetchOutlook: Google data overlays the first hour and is attributed", async () => {
  _resetGoogleCache();
  const o = await withFetch(() => fetchOutlook(island, { googleKey: "k" }), stubFetch({ googleOk: true }));
  assert.equal(o.sources.rain, "google");
  assert.equal(o.hourly[0].rainProb, 60);
  assert.equal(o.hourly[0].thunderProb, 45);
  assert.equal(o.hourly[0].precipMm, 1, "mm stays Open-Meteo");
  assert.equal(o.hourly[1].rainProb, 5);
});

test("fetchOutlook: Google down → Open-Meteo values, open-meteo source", async () => {
  _resetGoogleCache();
  const o = await withFetch(() => fetchOutlook(island, { googleKey: "k" }), stubFetch({ googleOk: false }));
  assert.equal(o.sources.rain, "open-meteo");
  assert.equal(o.hourly[0].rainProb, 5);
  assert.equal(o.hourly[0].thunderProb, null);
});

// ---- daily: forecast/days:lookup for the 7-day cards ----

// Trimmed shape of a forecast/days:lookup response.
const half = (rain, thunder) => ({
  precipitation: { probability: { type: "RAIN", percent: rain } },
  thunderstormProbability: thunder,
});
function day(date, dayRain, nightRain, dayThunder, nightThunder) {
  const [year, month, d] = date.split("-").map(Number);
  return {
    displayDate: { year, month, day: d },
    daytimeForecast: half(dayRain, dayThunder),
    nighttimeForecast: half(nightRain, nightThunder),
  };
}
const daysBody = {
  forecastDays: [day("2026-11-06", 35, 70, 10, 40), day("2026-11-07", 20, 10, 0, 0)],
};

test("daily: keyed by local date, chance = the wetter of day and night", async () => {
  _resetGoogleCache();
  const f = okFetch(daysBody);
  const byDate = await fetchGoogleDaily(island, "k", { fetchImpl: f });
  assert.match(f.calls[0], /forecast\/days:lookup/);
  assert.match(f.calls[0], /days=7/);
  assert.deepEqual(byDate.get("2026-11-06"), { rainProb: 70, thunderProb: 40 });
  assert.deepEqual(byDate.get("2026-11-07"), { rainProb: 20, thunderProb: 0 });
});

test("daily: one half missing → uses the other; both missing → null", async () => {
  _resetGoogleCache();
  const body = { forecastDays: [
    { displayDate: { year: 2026, month: 11, day: 6 }, daytimeForecast: half(30, 5) },
    { displayDate: { year: 2026, month: 11, day: 7 }, daytimeForecast: half(150, -1), nighttimeForecast: {} },
  ] };
  const byDate = await fetchGoogleDaily(island, "k", { fetchImpl: okFetch(body) });
  assert.deepEqual(byDate.get("2026-11-06"), { rainProb: 30, thunderProb: 5 });
  assert.deepEqual(byDate.get("2026-11-07"), { rainProb: null, thunderProb: null });
});

test("daily and hourly cache separately (one doesn't serve the other)", async () => {
  _resetGoogleCache();
  const f = okFetch(daysBody);
  await fetchGoogleDaily(island, "k", { fetchImpl: f });
  const h = await fetchGoogleHourly(island, "k", { fetchImpl: okFetch(googleBody) });
  assert.equal(h.size, 3);
  await fetchGoogleDaily(island, "k", { fetchImpl: f });
  assert.equal(f.calls.length, 1, "daily served from its own cache");
});

test("daily failure backs off without blocking hourly", async () => {
  _resetGoogleCache();
  const warn = console.warn; console.warn = () => {};
  try {
    const down = async () => { throw new Error("down"); };
    assert.equal(await fetchGoogleDaily(island, "k", { fetchImpl: down }), null);
    const h = await fetchGoogleHourly(island, "k", { fetchImpl: okFetch(googleBody) });
    assert.equal(h.size, 3);
  } finally { console.warn = warn; }
});

test("mergeDaily: Google chance per matched date, others keep Open-Meteo", () => {
  const om = [{ date: "2026-11-06", rainProb: 90 }, { date: "2026-11-08", rainProb: 15 }];
  const byDate = new Map([["2026-11-06", { rainProb: 70, thunderProb: 40 }]]);
  const { daily, rainSource } = mergeDaily(om, byDate);
  assert.deepEqual(daily[0], { date: "2026-11-06", rainProb: 70, thunderProb: 40 });
  assert.deepEqual(daily[1], { date: "2026-11-08", rainProb: 15, thunderProb: null });
  assert.equal(rainSource, "google");
});

test("mergeDaily: no Google data → unchanged, source open-meteo", () => {
  const om = [{ date: "2026-11-06", rainProb: 90 }];
  const { daily, rainSource } = mergeDaily(om, null);
  assert.deepEqual(daily[0], { date: "2026-11-06", rainProb: 90, thunderProb: null });
  assert.equal(rainSource, "open-meteo");
});

test("fetchOutlook: 7-day cards take Google's daily chance and are attributed", async () => {
  _resetGoogleCache();
  const o = await withFetch(() => fetchOutlook(island, { googleKey: "k" }), stubFetch({ googleOk: true }));
  assert.equal(o.sources.dailyRain, "google");
  assert.equal(o.daily[0].rainProb, 70);
  assert.equal(o.daily[0].thunderProb, 40);
});

test("fetchOutlook: Google down → 7-day cards stay Open-Meteo", async () => {
  _resetGoogleCache();
  const o = await withFetch(() => fetchOutlook(island, { googleKey: "k" }), stubFetch({ googleOk: false }));
  assert.equal(o.sources.dailyRain, "open-meteo");
  assert.equal(o.daily[0].rainProb, 20);
  assert.equal(o.daily[0].thunderProb, null);
});

// ---- thunder without rain (CodeRabbit on #95) ----

test("mergeHourly: a valid Google thunder chance is kept when its rain chance is missing", () => {
  const g = new Map([[toUtcMs("2026-11-06T12:00"), { rainProb: null, thunderProb: 60 }]]);
  const { hourly, rainSource } = mergeHourly(omHours, toUtcMs, g);
  assert.equal(hourly[0].rainProb, 5, "rain chance stays Open-Meteo's");
  assert.equal(hourly[0].thunderProb, 60, "thunder chance comes from Google");
  assert.equal(rainSource, "google", "any Google number shown needs the attribution");
});

test("mergeDaily: a valid Google thunder chance is kept when its rain chance is missing", () => {
  const om = [{ date: "2026-11-06", rainProb: 90 }];
  const byDate = new Map([["2026-11-06", { rainProb: null, thunderProb: 45 }]]);
  const { daily, rainSource } = mergeDaily(om, byDate);
  assert.deepEqual(daily[0], { date: "2026-11-06", rainProb: 90, thunderProb: 45 });
  assert.equal(rainSource, "google");
});

test("merge: an entry with neither chance usable counts as no Google data", () => {
  const g = new Map([[toUtcMs("2026-11-06T12:00"), { rainProb: null, thunderProb: null }]]);
  const { hourly, rainSource } = mergeHourly(omHours, toUtcMs, g);
  assert.equal(hourly[0].rainProb, 5);
  assert.equal(hourly[0].thunderProb, null);
  assert.equal(rainSource, "open-meteo");
});

test("merge: an Open-Meteo thunder value is kept when Google has none", () => {
  const om = [{ date: "2026-11-06", rainProb: 30, thunderProb: 20 }];
  const byDate = new Map([["2026-11-06", { rainProb: 55, thunderProb: null }]]);
  assert.deepEqual(mergeDaily(om, byDate).daily[0], { date: "2026-11-06", rainProb: 55, thunderProb: 20 });
});
