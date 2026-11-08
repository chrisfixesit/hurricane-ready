/**
 * Google Maps Platform Weather API — rain and thunderstorm chances for the
 * Rain & wind panel (hourly) and the 7-day cards (daily). Optional: without
 * GOOGLE_WEATHER_API_KEY, or on any failure, these return null and the page
 * stays on Open-Meteo.
 *
 * Why only these two fields: Google's chance-of-rain agrees with its own
 * rain amounts, while Open-Meteo's precipitation_probability (an ensemble
 * product) can read 5% in an hour its deterministic run gives 1.5 mm. Google
 * also offers a thunderstorm probability Open-Meteo doesn't. Everything else,
 * including the mm that drive the flood watch, stays on Open-Meteo.
 *
 * Billing: the server polls every 15 min, so each endpoint is cached for an
 * hour — about 720 calls a month each, 1,440 for both. Attribution is
 * required wherever these numbers show (see renderRainWind and
 * renderForecast in web/app.js).
 */
const HOURS_URL = "https://weather.googleapis.com/v1/forecast/hours:lookup";
const DAYS_URL = "https://weather.googleapis.com/v1/forecast/days:lookup";
const TTL_MS = 60 * 60_000;
// After a failure, skip that endpoint for a while so a slow or down API can't
// add its 8s timeout to every 15-minute poll.
const BACKOFF_MS = 10 * 60_000;

// One cache + backoff per endpoint, so a daily outage never hides hourly data.
const state = { hours: { cache: null, failedAt: null }, days: { cache: null, failedAt: null } };

export function _resetGoogleCache() {
  for (const s of Object.values(state)) {
    s.cache = null;
    s.failedAt = null;
  }
}

// Google documents these as integer percentages; anything else is treated as
// missing so Open-Meteo's value stands.
const pct = (v) => (Number.isInteger(v) && v >= 0 && v <= 100 ? v : null);

// Shared fetch → parse → cache/backoff. `parse(body)` returns a Map, which
// must be non-empty to count as success.
async function cachedLookup(s, island, apiKey, url, parse, { fetchImpl = fetch, now = Date.now } = {}) {
  if (!apiKey) return null;
  const cacheKey = `${island.lat},${island.lon}`;
  if (s.cache && s.cache.key === cacheKey && now() - s.cache.at < TTL_MS) return s.cache.value;
  if (s.failedAt != null && now() - s.failedAt < BACKOFF_MS) return null;
  try {
    // Key goes in a header, not the query string, so it never lands in a
    // logged URL or error message.
    const res = await fetchImpl(url, {
      headers: { "X-Goog-Api-Key": apiKey },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`google weather ${res.status}`);
    const value = parse(await res.json());
    if (!value.size) throw new Error("no forecast data");
    s.cache = { at: now(), key: cacheKey, value };
    s.failedAt = null;
    return value;
  } catch (err) {
    s.failedAt = now();
    console.warn(`Google weather unavailable (${err.message})`);
    return null;
  }
}

export function fetchGoogleHourly(island, apiKey, opts) {
  const url =
    `${HOURS_URL}?location.latitude=${island.lat}&location.longitude=${island.lon}` +
    `&hours=24&pageSize=24`;
  return cachedLookup(state.hours, island, apiKey, url, (body) => {
    const byHour = new Map();
    for (const h of body.forecastHours ?? []) {
      const start = Date.parse(h.interval?.startTime);
      if (!Number.isFinite(start)) continue;
      byHour.set(start, {
        rainProb: pct(h.precipitation?.probability?.percent),
        thunderProb: pct(h.thunderstormProbability),
      });
    }
    return byHour;
  }, opts);
}

// The wetter of daytime and nighttime, to match Open-Meteo's
// precipitation_probability_max over the whole day.
const maxOf = (a, b) => (a == null ? b : b == null ? a : Math.max(a, b));

/**
 * Daily chances keyed by the island's local date ("YYYY-MM-DD", the same
 * form as Open-Meteo's daily.time with timezone=auto).
 */
export function fetchGoogleDaily(island, apiKey, opts) {
  const url =
    `${DAYS_URL}?location.latitude=${island.lat}&location.longitude=${island.lon}` +
    `&days=7&pageSize=7`;
  return cachedLookup(state.days, island, apiKey, url, (body) => {
    const byDate = new Map();
    for (const d of body.forecastDays ?? []) {
      const { year, month, day } = d.displayDate ?? {};
      if (!year || !month || !day) continue;
      const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dt = d.daytimeForecast, nt = d.nighttimeForecast;
      byDate.set(date, {
        rainProb: maxOf(pct(dt?.precipitation?.probability?.percent), pct(nt?.precipitation?.probability?.percent)),
        thunderProb: maxOf(pct(dt?.thunderstormProbability), pct(nt?.thunderstormProbability)),
      });
    }
    return byDate;
  }, opts);
}

/**
 * Overlay Google's per-hour chances onto the Open-Meteo hourly strip. Pure.
 * `toUtcMs` converts an Open-Meteo naive local timestamp to a UTC instant.
 */
export function mergeHourly(omHourly, toUtcMs, googleByHour) {
  let matched = 0;
  const hourly = omHourly.map((x) => {
    const g = googleByHour?.get(toUtcMs(x.time));
    if (!g || g.rainProb == null) return { ...x, thunderProb: null };
    matched++;
    return { ...x, rainProb: g.rainProb, thunderProb: g.thunderProb };
  });
  return { hourly, rainSource: matched ? "google" : "open-meteo" };
}

/** Overlay Google's per-day chances onto the Open-Meteo 7-day cards. Pure. */
export function mergeDaily(omDaily, googleByDate) {
  let matched = 0;
  const daily = omDaily.map((x) => {
    const g = googleByDate?.get(x.date);
    if (!g || g.rainProb == null) return { ...x, thunderProb: null };
    matched++;
    return { ...x, rainProb: g.rainProb, thunderProb: g.thunderProb };
  });
  return { daily, rainSource: matched ? "google" : "open-meteo" };
}
