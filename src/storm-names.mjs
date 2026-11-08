/**
 * Atlantic storm names for the current season.
 *
 * The WMO keeps six Atlantic lists and uses them in rotation, so the 2026
 * list comes round again in 2032. A list only changes when a deadly or
 * costly storm's name is retired, which the WMO decides each spring.
 *
 * Live source: NHC's names page, read about once a day, so a retirement
 * shows up when NHC updates the page. Fallback: the six lists below, picked
 * by year. They only need touching if the page can't be read and a name
 * has been retired since they were copied (NHC aboutnames.shtml, 2026-11).
 */

export const ATLANTIC_LISTS = {
  2026: ["Arthur", "Bertha", "Cristobal", "Dolly", "Edouard", "Fay", "Gonzalo", "Hanna", "Isaias", "Josephine", "Kyle", "Leah", "Marco", "Nana", "Omar", "Paulette", "Rene", "Sally", "Teddy", "Vicky", "Wilfred"],
  2027: ["Ana", "Bill", "Claudette", "Danny", "Elsa", "Fred", "Grace", "Henri", "Imani", "Julian", "Kate", "Larry", "Mindy", "Nicholas", "Odette", "Peter", "Rose", "Sam", "Teresa", "Victor", "Wanda"],
  2028: ["Alex", "Bonnie", "Colin", "Danielle", "Earl", "Farrah", "Gaston", "Hermine", "Idris", "Julia", "Karl", "Lisa", "Martin", "Nicole", "Owen", "Paula", "Richard", "Shary", "Tobias", "Virginie", "Walter"],
  2029: ["Arlene", "Bret", "Cindy", "Don", "Emily", "Franklin", "Gert", "Harold", "Idalia", "Jose", "Katia", "Lee", "Margot", "Nigel", "Ophelia", "Philippe", "Rina", "Sean", "Tammy", "Vince", "Whitney"],
  2030: ["Alberto", "Brianna", "Chris", "Debby", "Ernesto", "Francine", "Gordon", "Holly", "Isaac", "Joyce", "Kirk", "Leslie", "Miguel", "Nadine", "Oscar", "Patty", "Rafael", "Sara", "Tony", "Valerie", "William"],
  2031: ["Andrea", "Barry", "Chantal", "Dexter", "Erin", "Fernand", "Gabrielle", "Humberto", "Imelda", "Jerry", "Karen", "Lorenzo", "Molly", "Nestor", "Olga", "Pablo", "Rebekah", "Sebastien", "Tanya", "Van", "Wendy"],
};

const ROTATION = 6;
const LIST_LENGTH = 21;

// Same position in the six-year cycle, e.g. 2032 -> 2026's list.
const sameRotation = (a, b) => (((a - b) % ROTATION) + ROTATION) % ROTATION === 0;

export function builtInNames(year) {
  const base = Object.keys(ATLANTIC_LISTS).map(Number).find((y) => sameRotation(y, year));
  return ATLANTIC_LISTS[base];
}

// How far down the list the season has got: the 1-based position of the
// latest list name seen. Matching on names (not "al05"-style numbers) keeps
// unnamed depressions, which take a number but no name, from skewing it.
export function namesReached(list, names) {
  let reached = 0;
  for (const n of names ?? []) {
    const i = list.findIndex((x) => x.toUpperCase() === String(n).toUpperCase());
    reached = Math.max(reached, i + 1);
  }
  return reached;
}

// The page's Atlantic section is a table with one <th> per year and one <td>
// per year holding its names separated by <br>. Returns { year: names[] },
// or null if that section can't be found.
export function parseNamesPage(html) {
  const start = html.search(/<a name="atl">/i);
  if (start < 0) return null;
  const table = html.slice(start).match(/<table[\s\S]*?<\/table>/i)?.[0];
  if (!table) return null;
  const years = [...table.matchAll(/<th[^>]*>\s*(\d{4})\s*<\/th>/gi)].map((m) => Number(m[1]));
  const cells = [...table.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
    m[1].split(/<br\s*\/?>/i).map((n) => n.replace(/<[^>]+>/g, "").trim()).filter(Boolean));
  if (!years.length || years.length !== cells.length) return null;
  return Object.fromEntries(years.map((y, i) => [y, cells[i]]));
}

const NAMES_URL = "https://www.nhc.noaa.gov/aboutnames.shtml";
const NAMES_TTL_MS = 24 * 60 * 60 * 1000; // lists change at most once a year
const RETRY_MS = 60 * 60 * 1000; // after a failure, don't refetch every tick

const looksLikeList = (names) =>
  Array.isArray(names) && names.length === LIST_LENGTH && names.every((n) => /^[A-Z][A-Za-z'-]+$/.test(n));

let namesCache = null; // last good: { year, at, names }
let failedAt = -Infinity;

// This season's names. NHC's page when it can be read and looks right,
// otherwise the last good copy for this year, otherwise the built-in list.
export async function fetchSeasonNames({ year = new Date().getUTCFullYear(), now = Date.now(), fresh = false } = {}) {
  const cached = namesCache?.year === year ? namesCache.names : null;
  if (!fresh && cached && now - namesCache.at < NAMES_TTL_MS) return cached;
  if (!fresh && now - failedAt < RETRY_MS) return cached ?? builtInNames(year);
  try {
    const res = await fetch(NAMES_URL, {
      headers: { "User-Agent": "hurricane-ready (github.com/chrisfixesit/hurricane-ready)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`names page ${res.status}`);
    const lists = parseNamesPage(await res.text());
    const key = lists && Object.keys(lists).map(Number).find((y) => sameRotation(y, year));
    const names = key && lists[key];
    if (!looksLikeList(names)) throw new Error("names page layout not recognised");
    namesCache = { year, at: now, names };
    return names;
  } catch (err) {
    failedAt = now;
    console.warn(`NHC names page unavailable (${err.message}); using ${cached ? "last good" : "built-in"} list`);
    return cached ?? builtInNames(year);
  }
}
