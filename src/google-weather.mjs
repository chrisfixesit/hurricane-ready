/**
 * Google Maps Platform Weather API — hourly rain and thunderstorm chances
 * for the Rain & wind panel. Optional: without GOOGLE_WEATHER_API_KEY, or on
 * any failure, this returns null and the panel stays on Open-Meteo.
 *
 * Why only these two fields: Google's chance-of-rain agrees with its own
 * rain amounts, while Open-Meteo's precipitation_probability (an ensemble
 * product) can read 5% in an hour its deterministic run gives 1.5 mm. Google
 * also offers a thunderstorm probability Open-Meteo doesn't. Everything else,
 * including the mm that drive the flood watch, stays on Open-Meteo.
 *
 * Billing: the server polls every 15 min, so results are cached for an hour —
 * about 720 calls a month. Attribution is required wherever these numbers
 * show (see renderRainWind in web/app.js).
 */
const URL_BASE = "https://weather.googleapis.com/v1/forecast/hours:lookup";
const TTL_MS = 60 * 60_000;

let cache = null; // { at, key, byHour }

export function _resetGoogleCache() {
  cache = null;
}

export async function fetchGoogleHourly(island, apiKey, { fetchImpl = fetch, now = Date.now } = {}) {
  if (!apiKey) return null;
  const cacheKey = `${island.lat},${island.lon}`;
  if (cache && cache.key === cacheKey && now() - cache.at < TTL_MS) return cache.byHour;

  const url =
    `${URL_BASE}?location.latitude=${island.lat}&location.longitude=${island.lon}` +
    `&hours=24&pageSize=24`;
  try {
    // Key goes in a header, not the query string, so it never lands in a
    // logged URL or error message.
    const res = await fetchImpl(url, {
      headers: { "X-Goog-Api-Key": apiKey },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`google weather ${res.status}`);
    const body = await res.json();
    const byHour = new Map();
    for (const h of body.forecastHours ?? []) {
      const start = Date.parse(h.interval?.startTime);
      if (!Number.isFinite(start)) continue;
      byHour.set(start, {
        rainProb: h.precipitation?.probability?.percent ?? null,
        thunderProb: h.thunderstormProbability ?? null,
      });
    }
    if (!byHour.size) throw new Error("no forecast hours");
    cache = { at: now(), key: cacheKey, byHour };
    return byHour;
  } catch (err) {
    console.warn(`Google weather unavailable (${err.message})`);
    return null;
  }
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
