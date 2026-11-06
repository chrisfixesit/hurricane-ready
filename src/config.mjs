import { validateOutboundUrl } from "./url-safety.mjs";

const num = (v, fallback) => (v != null && v !== "" ? Number(v) : fallback);
const list = (v) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// Outbound URL allowlists (#53). Hosts the server is allowed to fetch
// from. Operators who need to point at a different upstream (mirror,
// staging) should widen these by editing the source — env-driven URL
// overrides are validated against this list, so a typo / leaked env
// can't redirect outbound traffic to attacker-controlled hosts or to
// AWS metadata.
const NHC_HOSTS = ["www.nhc.noaa.gov", "nhc.noaa.gov"];
const CAPEWS_HOSTS = [".capews.com"]; // strict subdomains only

// Validate and apply defaults. Each call throws on bad config — the
// server refuses to boot, which is exactly what you want when a URL
// is misconfigured.
const nhcUrl = (process.env.NHC_URL ?? "https://www.nhc.noaa.gov/CurrentStorms.json");
validateOutboundUrl("NHC_URL", nhcUrl, { allowedHosts: NHC_HOSTS });

if (process.env.CAPEWS_ACTIVE_URL) {
  validateOutboundUrl("CAPEWS_ACTIVE_URL", process.env.CAPEWS_ACTIVE_URL, { allowedHosts: CAPEWS_HOSTS });
}
if (process.env.CAPEWS_PUBLIC_URL) {
  validateOutboundUrl("CAPEWS_PUBLIC_URL", process.env.CAPEWS_PUBLIC_URL, { allowedHosts: CAPEWS_HOSTS });
}
if (process.env.WEBHOOK_URL) {
  // Webhook is operator-configurable (Slack/Discord/custom) — no host
  // allowlist, but still https-only and no private/loopback/metadata IPs.
  validateOutboundUrl("WEBHOOK_URL", process.env.WEBHOOK_URL);
}

export const config = {
  // Island under watch (defaults: Barbados)
  island: {
    name: process.env.ISLAND_NAME ?? "Barbados",
    lat: num(process.env.ISLAND_LAT, 13.19),
    lon: num(process.env.ISLAND_LON, -59.54),
  },

  // Threat thresholds (km / hours)
  thresholds: {
    imminentKm: num(process.env.IMMINENT_KM, 150),
    imminentHours: num(process.env.IMMINENT_HOURS, 48),
    warningKm: num(process.env.WARNING_KM, 300),
    warningHours: num(process.env.WARNING_HOURS, 72),
    // Basin awareness box for WATCH level
    watchMaxLat: num(process.env.WATCH_MAX_LAT, 25),
    watchMinLon: num(process.env.WATCH_MIN_LON, -90),
    watchMaxLon: num(process.env.WATCH_MAX_LON, -40),
  },

  pollMinutes: num(process.env.POLL_MINUTES, 15),
  port: num(process.env.PORT, 8080),

  // Replay mode: REPLAY=1 replays fixtures/beryl-2024.json
  replay: process.env.REPLAY === "1",
  replayIntervalSeconds: num(process.env.REPLAY_INTERVAL_SECONDS, 12),
  // Replay dispatch override (#40): replay defaults to NOT firing SES /
  // SNS / webhook / push. Set REPLAY_DISPATCH=1 to allow it (for end-to-end
  // channel testing).
  replayDispatch: process.env.REPLAY_DISPATCH === "1",

  // AI briefings (optional — template fallback without it)
  bedrock: {
    enabled: process.env.DISABLE_AI !== "1",
    modelId:
      process.env.MODEL_ID ?? "us.anthropic.claude-haiku-4-5-20251001-v1:0",
    region: process.env.AWS_REGION ?? "us-east-1",
  },

  // Google Maps Platform Weather API (optional). Adds hourly rain and
  // thunderstorm chances to the Rain & wind panel; Open-Meteo without it.
  googleWeatherKey: process.env.GOOGLE_WEATHER_API_KEY ?? "",

  // Alert channels (all optional)
  alerts: {
    emails: list(process.env.ALERT_EMAILS),
    senderEmail: process.env.SENDER_EMAIL ?? "",
    phones: list(process.env.ALERT_PHONES), // E.164, e.g. +12465550123
    webhookUrl: process.env.WEBHOOK_URL ?? "",
  },

  stateFile: process.env.STATE_FILE ?? "/data/state.json",
  nhcUrl,
};
