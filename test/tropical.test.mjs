import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseOutlook,
  stormsSoFar,
  parseSeasonIndex,
  fetchSeasonNamesUsed,
  ATLANTIC_NAMES_2026,
  parseWaves,
} from "../src/tropical.mjs";

const TWD = `TROPICAL WAVES...

A far eastern Atlantic tropical wave has its axis along 23W from
03N to 15N. It is moving westward at 10 kt.

An eastern Caribbean tropical wave has its axis along 62W south
of 18N. Scattered showers and thunderstorms across the Leeward
Islands.

A western Caribbean tropical wave is along 80W south of 18N.

...MONSOON TROUGH/ITCZ...

The monsoon trough axis enters the Atlantic near 19N16W.`;

test("parseWaves: extracts axes and flags the one near Barbados", () => {
  const { waves, near } = parseWaves(TWD, 59.54);
  assert.deepEqual(waves.map((w) => w.axisLonW), [23, 62, 80]);
  assert.ok(near);
  assert.equal(near.axisLonW, 62); // ~2.5° west of Barbados
});

test("parseWaves: proximity window picks the right wave (or none)", () => {
  assert.equal(parseWaves(TWD, 84).near.axisLonW, 80); // 80W within 6° of 84
  assert.equal(parseWaves(TWD, 40).near, null); // nearest axis (23/62) >6° away
});

test("parseWaves: empty when no wave section", () => {
  assert.deepEqual(parseWaves("No tropical waves discussed today.", 59.54), { waves: [], near: null });
});

const wrap = (body) =>
  `<rss><channel><item><pubDate>Thu, 18 Jun 2026 12:00:00 +0000</pubDate>` +
  `<description><![CDATA[${body}]]></description></item></channel></rss>`;

const QUIET = wrap(
  `TWOAT<br/><br/>Tropical Weather Outlook<br/>NWS National Hurricane Center Miami FL<br/>` +
    `800 PM EDT Wed Jun 17 2026<br/><br/>Active Systems:<br/>` +
    `The NHC is issuing advisories on Tropical Storm Arthur.<br/><br/>` +
    `Tropical cyclone formation is not expected during the next 7 days.<br/><br/>$$<br/>Forecaster Beven`
);

const TWO_AREAS = wrap(
  `TWOAT<br/><br/>Active Systems:<br/>None.<br/><br/>` +
    `1. Central Tropical Atlantic:<br/>A tropical wave.<br/>` +
    `* Formation chance through 48 hours...low...20 percent.<br/>` +
    `* Formation chance through 7 days...medium...50 percent.<br/><br/>` +
    `2. Near the Lesser Antilles:<br/>An area of low pressure.<br/>` +
    `* Formation chance through 48 hours...high...70 percent.<br/>` +
    `* Formation chance through 7 days...high...80 percent.<br/><br/>$$`
);

test("parseOutlook: quiet outlook reports no formation", () => {
  const o = parseOutlook(QUIET);
  assert.equal(o.formationExpected, false);
  assert.equal(o.areas.length, 0);
  assert.match(o.headline, /No new tropical systems/);
  assert.match(o.activeSystemsText, /Arthur/);
  assert.equal(o.issuedAt, "2026-06-18T12:00:00.000Z");
});

test("parseOutlook: parses numbered areas with formation chances", () => {
  const o = parseOutlook(TWO_AREAS);
  assert.equal(o.formationExpected, true);
  assert.equal(o.areas.length, 2);
  assert.equal(o.areas[0].where, "Central Tropical Atlantic");
  assert.deepEqual(o.areas[0].chance48, { pct: 20, category: "low" });
  assert.deepEqual(o.areas[0].chance7, { pct: 50, category: "medium" });
  assert.deepEqual(o.areas[1].chance7, { pct: 80, category: "high" });
  assert.match(o.headline, /2 areas being watched/);
  assert.match(o.headline, /80%/);
});

test("parseOutlook: category thresholds (low<40<=medium<60<=high)", () => {
  const o = parseOutlook(
    wrap(
      `1. Test:<br/>x.<br/>* Formation chance through 48 hours...low...30 percent.<br/>` +
        `* Formation chance through 7 days...high...60 percent.<br/><br/>$$`
    )
  );
  assert.equal(o.areas[0].chance48.category, "low");
  assert.equal(o.areas[0].chance7.category, "high");
});

test("stormsSoFar: counts list names reached by active storms", () => {
  assert.equal(stormsSoFar([{ name: "Arthur" }]), 1);
  assert.equal(stormsSoFar([{ name: "Cristobal" }, { name: "Arthur" }]), 3);
  assert.equal(stormsSoFar([]), 0);
  // Numbered depressions and off-list (e.g. Pacific or replayed) names don't count.
  assert.equal(stormsSoFar([{ name: "Ten" }, { name: "Beryl" }]), 0);
});

// Excerpt of NHC's ATCF storm index (ftp.nhc.noaa.gov/atcf/index/storm_list.txt).
const ATCF_INDEX = [
  "    ANDREA, AL, L, , , , , 01, 2025, TS, S, 2025062200, 2025062512, , , , , , ARCHIVE, , AL012025",
  "    ARTHUR, AL, L, , , , , 01, 2026, LO, O, 2026060800, 9999999999, , 001, , , 1, WARNING, 1, AL012026",
  "    BERTHA, AL, L, , , , , 02, 2026, TS, O, 2026071306, 9999999999, , 004, , , 8, WARNING, 2, AL022026",
  "       TEN, AL, L, , , , , 03, 2026, TD, O, 2026080206, 9999999999, , 006, , , 8, WARNING, 3, AL032026",
  " CRISTOBAL, AL, L, , , , , 04, 2026, LO, O, 2026081206, 9999999999, , 006, , , 8, WARNING, 3, AL042026",
  "GENESIS018, AL, L, , , , , 71, 2026, DB, O, 2026091906, 9999999999, , 018, , , , GENESIS, , AL712026",
  "    INVEST, AL, L, , , , , 94, 2026, EX, O, 2026110118, 9999999999, , 028, , , 2, METWATCH, , AL942026",
  "      HANNA, EP, E, , , , , 05, 2026, TS, O, 2026070100, 9999999999, , 010, , , 8, WARNING, 1, EP052026",
].join("\n");

test("parseSeasonIndex: counts this year's named Atlantic storms on the list", () => {
  // Arthur, Bertha, Cristobal; TD Ten, genesis, invest, 2025 and Pacific skipped.
  assert.equal(parseSeasonIndex(ATCF_INDEX, 2026), 3);
  assert.equal(parseSeasonIndex(ATCF_INDEX, 2027), 0);
  assert.equal(parseSeasonIndex("", 2026), 0);
});

test("fetchSeasonNamesUsed: null when NHC is unreachable", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  t.mock.method(console, "warn", () => {});
  assert.equal(await fetchSeasonNamesUsed({ year: 2026, now: 0, fresh: true }), null);
});

test("fetchSeasonNamesUsed: parses and caches the index", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(url);
    return new Response(ATCF_INDEX, { status: 200 });
  });
  assert.equal(await fetchSeasonNamesUsed({ year: 2026, now: 1e12, fresh: true }), 3);
  assert.equal(await fetchSeasonNamesUsed({ year: 2026, now: 1e12 + 60_000 }), 3);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /storm_list\.txt$/);
});

test("ATLANTIC_NAMES_2026: 21 names, Leah replaced Laura", () => {
  assert.equal(ATLANTIC_NAMES_2026.length, 21);
  assert.equal(ATLANTIC_NAMES_2026[0], "Arthur");
  assert.ok(ATLANTIC_NAMES_2026.includes("Leah"));
  assert.ok(!ATLANTIC_NAMES_2026.includes("Laura"));
});
