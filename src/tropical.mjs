/**
 * Atlantic tropical situation, from the NOAA National Hurricane Center.
 *
 * NHC products are U.S. Government works in the public domain (the TWO feed
 * itself declares <copyright>none</copyright>), so the outlook text can be
 * surfaced directly. We still present a plain-language summary first and link
 * back to the official product.
 */

// Official WMO/NHC rotating name list for the 2026 Atlantic season.
// (Same list as 2020, with Leah replacing the retired Laura.)
// Source: https://www.nhc.noaa.gov/aboutnames.shtml — update this once a year.
export const ATLANTIC_NAMES_2026 = [
  "Arthur", "Bertha", "Cristobal", "Dolly", "Edouard", "Fay", "Gonzalo",
  "Hanna", "Isaias", "Josephine", "Kyle", "Leah", "Marco", "Nana", "Omar",
  "Paulette", "Rene", "Sally", "Teddy", "Vicky", "Wilfred",
];

const TWO_URL = "https://www.nhc.noaa.gov/xml/TWOAT.xml";
const TWO_HUMAN_URL = "https://www.nhc.noaa.gov/text/MIATWOAT.shtml";
const TWD_URL = "https://www.nhc.noaa.gov/text/MIATWDAT.shtml";
const TWD_HUMAN_URL = "https://www.nhc.noaa.gov/text/MIATWDAT.shtml";

function decode(s) {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const catOf = (pct) => (pct >= 60 ? "high" : pct >= 40 ? "medium" : "low");

// Pull a "...word...NN percent" formation chance out of an area paragraph.
function chance(block, window) {
  const re = new RegExp(`${window}\\.\\.\\.[\\s\\S]*?(\\d+)\\s*percent`, "i");
  const m = block.match(re);
  if (!m) return null;
  const pct = Number(m[1]);
  return { pct, category: catOf(pct) };
}

function parseAreas(body) {
  // Numbered areas: "1. ... 2. ..." up to the "$$" sign-off.
  const areas = [];
  const re = /(?:^|\n)\s*(\d+)\.\s+([\s\S]*?)(?=\n\s*\d+\.\s|\n\s*\$\$|$)/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const block = m[2].trim();
    const where = block.split(/[.:]/)[0].replace(/\s+/g, " ").trim();
    areas.push({
      num: Number(m[1]),
      where: where.slice(0, 120),
      chance48: chance(block, "48 hours"),
      chance7: chance(block, "7 days"),
    });
  }
  return areas;
}

export function parseOutlook(xml) {
  const cdata = xml.match(/<description>\s*<!\[CDATA\[([\s\S]*?)\]\]>/);
  const pub = xml.match(/<item>[\s\S]*?<pubDate>([^<]+)<\/pubDate>/);
  if (!cdata) return null;
  const text = decode(cdata[1]);
  const formationExpected = !/not expected during the next\s*\d*\s*days/i.test(text);

  const active = text.match(/Active Systems:\s*([\s\S]*?)\n\n/i);
  const activeSystemsText = active
    ? active[1].replace(/\s+/g, " ").trim()
    : null;

  const areas = formationExpected ? parseAreas(text) : [];
  const topChance = areas.reduce(
    (max, a) => Math.max(max, a.chance7?.pct ?? 0),
    0
  );

  let headline;
  if (!formationExpected) {
    headline = "No new tropical systems expected to form in the next 7 days.";
  } else if (areas.length === 1) {
    headline = `1 area being watched for development (up to ${topChance}% chance in 7 days).`;
  } else {
    headline = `${areas.length} areas being watched for development (highest ${topChance}% in 7 days).`;
  }

  return {
    issuedAt: pub ? new Date(pub[1]).toISOString() : null,
    formationExpected,
    headline,
    activeSystemsText,
    areas,
    text,
    url: TWO_HUMAN_URL,
  };
}

export async function fetchTropicalOutlook() {
  try {
    const res = await fetch(TWO_URL, {
      headers: { "User-Agent": "hurricane-ready (github.com/christophercorbin/hurricane-ready)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`TWO ${res.status}`);
    return parseOutlook(await res.text());
  } catch (err) {
    console.warn(`Tropical outlook unavailable (${err.message})`);
    return null;
  }
}

// How far down this season's list we've got: the 1-based position of the
// latest list name seen. Matching on names (not "al05"-style numbers) keeps
// unnamed depressions, which take a number but no name, from skewing it.
function namesReached(names) {
  let reached = 0;
  for (const n of names) {
    const i = ATLANTIC_NAMES_2026.findIndex((x) => x.toUpperCase() === String(n).toUpperCase());
    reached = Math.max(reached, i + 1);
  }
  return reached;
}

// Names reached by the storms active right now. Only covers live storms, so
// the season-wide count comes from fetchSeasonNamesUsed below.
export function stormsSoFar(storms) {
  return namesReached((storms ?? []).map((s) => s.name ?? ""));
}

// NHC's ATCF storm index lists every system it has tracked, one CSV row each:
// name, basin, ..., number, year, ..., type (WARNING for real storms, plus
// GENESIS/METWATCH rows for invests). It keeps finished storms, so it gives
// the whole season's names, not just what's active.
const STORM_INDEX_URL = "https://ftp.nhc.noaa.gov/atcf/index/storm_list.txt";
const STORM_INDEX_TTL_MS = 60 * 60 * 1000; // ~290 KB; storms form over days, not minutes

export function parseSeasonIndex(text, year) {
  const names = [];
  for (const line of text.split("\n")) {
    const f = line.split(",").map((x) => x.trim());
    if (f[1] === "AL" && f[8] === String(year) && f[18] === "WARNING") names.push(f[0]);
  }
  return namesReached(names);
}

let seasonCache = null; // { year, at, value }

// Count of this season's names used so far, or null if NHC can't be reached
// (callers keep their last known count). Cached for an hour.
export async function fetchSeasonNamesUsed({ year = new Date().getUTCFullYear(), now = Date.now(), fresh = false } = {}) {
  if (!fresh && seasonCache?.year === year && now - seasonCache.at < STORM_INDEX_TTL_MS) return seasonCache.value;
  try {
    const res = await fetch(STORM_INDEX_URL, {
      headers: { "User-Agent": "hurricane-ready (github.com/chrisfixesit/hurricane-ready)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`storm index ${res.status}`);
    const value = parseSeasonIndex(await res.text(), year);
    seasonCache = { year, at: now, value };
    return value;
  } catch (err) {
    console.warn(`NHC storm index unavailable (${err.message})`);
    return null;
  }
}

// ---------- Tropical waves (NHC Tropical Weather Discussion) ----------
// A tropical wave is a trough in the trade winds — common, not a cyclone, but
// it brings the showers/gusty winds locals feel. We parse the discussion's
// "TROPICAL WAVES" section and flag any wave whose axis is near the island.

// Pull the TROPICAL WAVES section out of the discussion's plain text and
// return each wave's axis longitude (°W) plus the one nearest the island.
export function parseWaves(text, islandLonW = 59.54, windowDeg = 6) {
  const start = text.search(/TROPICAL WAVES/i);
  if (start < 0) return { waves: [], near: null };
  let section = text.slice(start);
  const endRel = section.slice(20).search(/\n\s*\.\.\.[A-Z]/); // next "...HEADING..."
  if (endRel >= 0) section = section.slice(0, endRel + 20);

  const waves = section
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => /tropical wave/i.test(p) && /along\s+\d{1,3}\s*W/i.test(p))
    .map((p) => {
      const m = p.match(/along\s+(\d{1,3})\s*W/i);
      return { axisLonW: m ? Number(m[1]) : null, text: p };
    })
    .filter((w) => w.axisLonW != null);

  let near = null;
  for (const w of waves) {
    const d = Math.abs(w.axisLonW - islandLonW);
    if (d <= windowDeg && (!near || d < Math.abs(near.axisLonW - islandLonW))) near = w;
  }
  return { waves, near };
}

export async function fetchTropicalWaves(islandLon = -59.54) {
  const islandLonW = Math.abs(islandLon);
  try {
    const res = await fetch(TWD_URL, {
      headers: { "User-Agent": "hurricane-ready (github.com/christophercorbin/hurricane-ready)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`TWD ${res.status}`);
    const html = await res.text();
    const text = html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\r/g, "");
    const { waves, near } = parseWaves(text, islandLonW);
    return {
      count: waves.length,
      near: Boolean(near),
      nearAxisLonW: near ? near.axisLonW : null,
      url: TWD_HUMAN_URL,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`Tropical waves unavailable (${err.message})`);
    return null;
  }
}
