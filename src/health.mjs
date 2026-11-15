import { timingSafeEqual } from "node:crypto";

// Two-tier health (#54): /healthz is public liveness only; the operational
// detail lives at /healthz/verbose behind an X-Health-Token header.

/** Constant-time check of the X-Health-Token header against the configured token. */
export function isHealthTokenValid(provided, expected) {
  if (!expected || typeof provided !== "string") return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** The verbose health payload. `now` (ms) and `uptimeSeconds` are passed in so it stays pure. */
export function verboseHealth({ status, now, uptimeSeconds, staleAfterSeconds, persistenceBroken }) {
  const ageS = status.updatedAt ? Math.round((now - new Date(status.updatedAt).getTime()) / 1000) : null;
  return {
    status: "ok",
    mode: status.mode,
    level: status.level,
    updatedAt: status.updatedAt,
    dataAgeSeconds: ageS,
    stale: ageS != null && ageS > staleAfterSeconds,
    uptimeSeconds,
    hasWeather: Boolean(status.weather),
    hasOutlook: Boolean(status.outlook),
    hasTropical: Boolean(status.tropical),
    persistenceBroken,
  };
}
