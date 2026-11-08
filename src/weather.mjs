/**
 * Current conditions for the island, from the free Open-Meteo API
 * (no key required). Returns null on any failure so the dashboard
 * simply omits the panel rather than breaking.
 */
const WMO = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Depositing rime fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  66: "Freezing rain", 67: "Heavy freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  80: "Light showers", 81: "Showers", 82: "Violent showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm",
};

import { fetchGoogleHourly, mergeHourly, fetchGoogleDaily, mergeDaily } from "./google-weather.mjs";

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const compass = (deg) => COMPASS[Math.round(((deg % 360) / 22.5)) % 16];

const UA = "hurricane-ready (github.com/christophercorbin/hurricane-ready)";
const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);

// Tide state from an hourly sea-level series: current height, whether it's
// rising, and the next high/low turning points after the current hour.
function computeTide(times, heights, startIdx) {
  if (!Array.isArray(times) || !Array.isArray(heights)) return null;
  const i = Math.max(0, Math.min(startIdx, heights.length - 1));
  const cur = heights[i];
  if (cur == null) return null;
  const rising = (heights[i + 1] ?? cur) >= cur;
  let nextHigh = null;
  let nextLow = null;
  for (let j = i + 1; j < heights.length - 1; j++) {
    const a = heights[j - 1], b = heights[j], c = heights[j + 1];
    if (a == null || b == null || c == null) continue;
    if (!nextHigh && b > a && b >= c) nextHigh = { time: times[j], m: round1(b) };
    if (!nextLow && b < a && b <= c) nextLow = { time: times[j], m: round1(b) };
    if (nextHigh && nextLow) break;
  }
  return { currentM: round1(cur), rising, nextHigh, nextLow };
}

const MOON_NAMES = [
  "New moon", "Waxing crescent", "First quarter", "Waxing gibbous",
  "Full moon", "Waning gibbous", "Last quarter", "Waning crescent",
];

// Moon phase from date alone (location-independent). Uses the mean synodic
// month measured from a known new moon (2000-01-06 18:14 UTC).
function moonPhase(date = new Date()) {
  const synodic = 29.530588853;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
  const days = date.getTime() / 86400000;
  const age = (((days - knownNewMoon) % synodic) + synodic) % synodic;
  const frac = age / synodic; // 0..1 through the cycle
  return {
    phase: MOON_NAMES[Math.floor(frac * 8 + 0.5) % 8],
    illumination: Math.round(((1 - Math.cos(2 * Math.PI * frac)) / 2) * 100),
    ageDays: Math.round(age * 10) / 10,
  };
}

export async function fetchCurrentWeather(island) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${island.lat}&longitude=${island.lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,` +
    `weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m&wind_speed_unit=kn`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "hurricane-ready (github.com/christophercorbin/hurricane-ready)",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`weather ${res.status}`);
    const c = (await res.json()).current;
    if (!c) throw new Error("no current block");
    return {
      tempC: Math.round(c.temperature_2m),
      feelsLikeC: Math.round(c.apparent_temperature),
      humidity: c.relative_humidity_2m,
      precipMm: c.precipitation,
      windKt: Math.round(c.wind_speed_10m),
      gustKt: Math.round(c.wind_gusts_10m),
      windFrom: compass(c.wind_direction_10m),
      code: c.weather_code,
      description: WMO[c.weather_code] ?? "—",
      observedAt: c.time,
    };
  } catch (err) {
    console.warn(`Weather unavailable (${err.message})`);
    return null;
  }
}

/**
 * Everyday outlook for the friendly dashboard sections: a 7-day daily
 * forecast, the next 24 hours of rain/wind/UV, and marine wave conditions.
 * All from the free Open-Meteo API (no key). Wind is returned in km/h for a
 * general audience (the storm panels use knots). Returns null on failure so
 * the dashboard simply hides the everyday sections rather than breaking.
 *
 * With `googleKey`, the rain and thunderstorm chances come from Google for
 * both the hourly strip and the 7-day cards (see google-weather.mjs);
 * `sources.rain` and `sources.dailyRain` say which one each shows so the page
 * can attribute it.
 */
export async function fetchOutlook(island, { googleKey = "" } = {}) {
  const base = `latitude=${island.lat}&longitude=${island.lon}&timezone=auto`;
  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?${base}&forecast_days=7` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,` +
    `precipitation_probability_max,wind_speed_10m_max,uv_index_max,` +
    `sunrise,sunset,daylight_duration` +
    `&hourly=precipitation_probability,precipitation,wind_speed_10m,` +
    `wind_gusts_10m,weather_code,uv_index`;
  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine?${base}` +
    `&hourly=wave_height,wave_period,sea_level_height_msl&daily=wave_height_max&forecast_days=2`;
  const airUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality?${base}` +
    `&current=pm10,pm2_5,dust,us_aqi`;
  const opts = {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(8000),
  };

  const fetchJson = (url) =>
    fetch(url, opts).then((r) =>
      r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))
    );

  try {
    const [fc, marineRes, airRes, googleRes, googleDailyRes] = await Promise.allSettled([
      fetchJson(forecastUrl),
      fetchJson(marineUrl),
      fetchJson(airUrl),
      fetchGoogleHourly(island, googleKey),
      fetchGoogleDaily(island, googleKey),
    ]);
    if (fc.status !== "fulfilled") throw new Error("forecast unavailable");
    const f = fc.value;

    const omDaily = f.daily.time.map((date, i) => ({
      date,
      code: f.daily.weather_code[i],
      description: WMO[f.daily.weather_code[i]] ?? "—",
      maxC: Math.round(f.daily.temperature_2m_max[i]),
      minC: Math.round(f.daily.temperature_2m_min[i]),
      rainProb: f.daily.precipitation_probability_max[i] ?? null,
      windMaxKmh: Math.round(f.daily.wind_speed_10m_max[i]),
      uvMax: f.daily.uv_index_max[i] != null ? Math.round(f.daily.uv_index_max[i]) : null,
    }));
    const { daily, rainSource: dailyRainSource } = mergeDaily(
      omDaily,
      googleDailyRes.status === "fulfilled" ? googleDailyRes.value : null
    );

    // Next 24 hours starting from the *current* local hour. Open-Meteo returns
    // naive local timestamps (e.g. "2026-06-20T21:00", no zone) plus the zone's
    // utc_offset_seconds. We must apply that offset — parsing the naive string
    // as if it were UTC skews the start by the island's offset (4h for AST),
    // making the strip begin hours in the future. local = UTC + offset, so the
    // instant's true UTC ms = (naive parsed as UTC) - offset.
    const now = Date.now();
    const offsetMs = (f.utc_offset_seconds ?? 0) * 1000;
    const toUtcMs = (t) => Date.parse(t + "Z") - offsetMs;
    const times = f.hourly.time;
    // First hour whose end is still ahead of now == the hour we're currently in.
    let start = times.findIndex((t) => toUtcMs(t) + 3600000 > now);
    if (start < 0) start = 0;
    const omHourly = [];
    for (let i = start; i < Math.min(start + 24, times.length); i++) {
      omHourly.push({
        time: times[i],
        rainProb: f.hourly.precipitation_probability[i] ?? null,
        precipMm: f.hourly.precipitation[i] ?? 0,
        windKmh: Math.round(f.hourly.wind_speed_10m[i]),
        gustKmh: Math.round(f.hourly.wind_gusts_10m[i]),
        code: f.hourly.weather_code[i],
        description: WMO[f.hourly.weather_code[i]] ?? "—",
        uv: f.hourly.uv_index[i] != null ? round1(f.hourly.uv_index[i]) : null,
      });
    }

    const { hourly, rainSource } = mergeHourly(
      omHourly,
      toUtcMs,
      googleRes.status === "fulfilled" ? googleRes.value : null
    );

    let marine = null;
    let tide = null;
    if (marineRes.status === "fulfilled" && marineRes.value.hourly) {
      const m = marineRes.value;
      const mt = m.hourly.time;
      const mOffsetMs = m.utc_offset_seconds != null ? m.utc_offset_seconds * 1000 : offsetMs;
      let mi = mt.findIndex((t) => Date.parse(t + "Z") - mOffsetMs + 3600000 > now);
      if (mi < 0) mi = 0;
      marine = {
        waveHeightM: round1(m.hourly.wave_height?.[mi]),
        wavePeriodS: m.hourly.wave_period?.[mi] != null ? Math.round(m.hourly.wave_period[mi]) : null,
        waveMaxTodayM: round1(m.daily?.wave_height_max?.[0]),
        observedAt: mt[mi],
      };
      tide = computeTide(mt, m.hourly.sea_level_height_msl, mi);
    }

    let airQuality = null;
    if (airRes.status === "fulfilled" && airRes.value.current) {
      const a = airRes.value.current;
      airQuality = {
        pm10: a.pm10 ?? null,
        pm25: a.pm2_5 ?? null,
        dust: a.dust ?? null,
        usAqi: a.us_aqi ?? null,
      };
    }

    const moon = moonPhase();
    const astro = {
      sunrise: f.daily.sunrise?.[0] ?? null,
      sunset: f.daily.sunset?.[0] ?? null,
      daylightSeconds: f.daily.daylight_duration?.[0] ?? null,
      moonPhase: moon.phase,
      moonIllumination: moon.illumination,
    };

    return {
      generatedAt: new Date().toISOString(),
      daily, hourly, marine, tide, airQuality, astro,
      sources: { rain: rainSource, dailyRain: dailyRainSource },
    };
  } catch (err) {
    console.warn(`Outlook unavailable (${err.message})`);
    return null;
  }
}
