import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ATLANTIC_LISTS,
  builtInNames,
  namesReached,
  parseNamesPage,
  fetchSeasonNames,
} from "../src/storm-names.mjs";

// The Atlantic section of NHC's names page as served on 2026-11-08.
const PAGE = readFileSync(new URL("./fixtures/nhc-aboutnames-atlantic.html", import.meta.url), "utf8");

test("built-in lists: six lists of 21, Leah replaced Laura", () => {
  assert.equal(Object.keys(ATLANTIC_LISTS).length, 6);
  for (const names of Object.values(ATLANTIC_LISTS)) assert.equal(names.length, 21);
  assert.ok(ATLANTIC_LISTS[2026].includes("Leah"));
  assert.ok(!ATLANTIC_LISTS[2026].includes("Laura"));
});

test("builtInNames: lists rotate every six years", () => {
  assert.equal(builtInNames(2026)[0], "Arthur");
  assert.equal(builtInNames(2027)[0], "Ana");
  assert.equal(builtInNames(2031)[0], "Andrea");
  assert.equal(builtInNames(2032)[0], "Arthur");
  assert.equal(builtInNames(2025)[0], "Andrea"); // 2031's list was last used in 2025
});

test("parseNamesPage: reads NHC's Atlantic table and matches the built-in lists", () => {
  // If this fails after refreshing the fixture, NHC changed a list (a
  // retirement) or the page layout: update ATLANTIC_LISTS or the parser.
  assert.deepEqual(parseNamesPage(PAGE), ATLANTIC_LISTS);
});

test("parseNamesPage: null without an Atlantic table", () => {
  assert.equal(parseNamesPage("<html><body>Service Unavailable</body></html>"), null);
  assert.equal(parseNamesPage('<a name="atl"></a><p>moved</p>'), null);
});

test("namesReached: furthest list position among the names given", () => {
  const list = ATLANTIC_LISTS[2026];
  assert.equal(namesReached(list, ["ARTHUR", "BERTHA"]), 2);
  assert.equal(namesReached(list, ["Josephine", "TEN"]), 10);
  assert.equal(namesReached(list, []), 0);
});

test("fetchSeasonNames: uses NHC's page, cached for a day", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    // A retirement on the page wins over the built-in list.
    return new Response(PAGE.replace("Kyle<br>", "Kylie<br>"), { status: 200 });
  });
  const names = await fetchSeasonNames({ year: 2026, now: 1e12, fresh: true });
  assert.equal(names[10], "Kylie");
  assert.equal((await fetchSeasonNames({ year: 2026, now: 1e12 + 60_000 }))[10], "Kylie");
  assert.equal(calls, 1);
});

test("fetchSeasonNames: keeps the last good list when the page breaks", async (t) => {
  t.mock.method(console, "warn", () => {});
  t.mock.method(globalThis, "fetch", async () => new Response(PAGE.replace("Kyle<br>", "Kylie<br>"), { status: 200 }));
  await fetchSeasonNames({ year: 2026, now: 2e12, fresh: true });
  t.mock.method(globalThis, "fetch", async () => new Response("<html>redesigned</html>", { status: 200 }));
  assert.equal((await fetchSeasonNames({ year: 2026, now: 2e12, fresh: true }))[10], "Kylie");
});

test("fetchSeasonNames: built-in list when NHC is unreachable, retried hourly", async (t) => {
  t.mock.method(console, "warn", () => {});
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; throw new Error("offline"); });
  assert.deepEqual(await fetchSeasonNames({ year: 2027, now: 3e12, fresh: true }), ATLANTIC_LISTS[2027]);
  assert.deepEqual(await fetchSeasonNames({ year: 2027, now: 3e12 + 60_000 }), ATLANTIC_LISTS[2027]);
  assert.equal(calls, 1);
});
