import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:8080";
const AA_TEXT = 4.5;

// Installs window.__contrast(el) -> WCAG 2.x contrast ratio of the element's
// text colour against its effective background. The background is resolved by
// walking up the ancestors, blending translucent backgrounds over whatever is
// behind them. Gradients/images can't be resolved, so only measure elements
// whose ancestors have solid or rgba backgrounds.
async function installContrastHelper(page) {
  await page.evaluate(() => {
    const parse = (c) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      const [r, g, b, a = 1] = m[1].split(/[,/ ]+/).filter(Boolean).map(Number);
      return { r, g, b, a };
    };
    const over = (top, bottom) => {
      const a = top.a + bottom.a * (1 - top.a);
      const mix = (t, b) => (t * top.a + b * bottom.a * (1 - top.a)) / a;
      return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a };
    };
    const effectiveBackground = (el) => {
      const layers = [];
      for (let n = el; n; n = n.parentElement) {
        const bg = parse(getComputedStyle(n).backgroundColor);
        if (bg.a > 0) layers.push(bg);
        if (bg.a === 1) break;
      }
      // fall back to the canvas (white) under everything
      return layers.reduceRight((below, layer) => over(layer, below), { r: 255, g: 255, b: 255, a: 1 });
    };
    const luminance = ({ r, g, b }) => {
      const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    window.__contrast = (el) => {
      const bg = effectiveBackground(el);
      const fg = over(parse(getComputedStyle(el).color), bg);
      const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
  });
}

async function load(page, theme) {
  await page.goto(BASE, { waitUntil: "load" });
  await expect(page.locator("#banner-title")).not.toHaveText("Checking the skies…", { timeout: 15000 });
  await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
  await installContrastHelper(page);
}

const ratio = (page, selector) =>
  page.evaluate((s) => window.__contrast(document.querySelector(s)), selector);

for (const theme of ["light", "dark"]) {
  // (#101) the "Live:" label in the header pill was navy on navy in light theme
  test(`header "Live:" label has AA contrast (${theme})`, async ({ page }) => {
    await load(page, theme);
    await expect(page.locator("#mode > b")).toBeVisible();
    expect(await ratio(page, "#mode > b")).toBeGreaterThanOrEqual(AA_TEXT);
  });
}

// (#102) go offline for real and let the app show its own notice
test("offline notice has AA contrast in light theme", async ({ page, context }) => {
  await load(page, "light");
  await context.setOffline(true);
  await expect(page.locator("#offline-note")).toBeVisible();
  expect(await ratio(page, "#offline-note")).toBeGreaterThanOrEqual(AA_TEXT);
});

// (#105) UV "High" badge and WARNING chip share a colour on a warning tint.
// They only render with live high-UV / storm data, so inject each into the
// real container it renders in: a .wx-tile in the sea grid, and a table cell
// in the storms table.
test("UV High badge and WARNING chip have AA contrast in light theme", async ({ page }) => {
  await load(page, "light");
  await page.evaluate(() => {
    document.getElementById("sea-grid").insertAdjacentHTML("beforeend",
      '<div class="wx-tile"><div class="lbl">UV</div><div class="val"><span id="t-uv" class="uv high">High</span></div></div>');
    document.getElementById("storms-body").insertAdjacentHTML("beforeend",
      '<tr><td><span id="t-chip" class="chip WARNING">WARNING</span></td></tr>');
  });
  // the hash router hides every card but the active page's, so measure each
  // badge only once its route is showing
  await page.evaluate(() => { location.hash = "#sea"; });
  await expect(page.locator("#t-uv")).toBeVisible();
  expect(await ratio(page, "#t-uv")).toBeGreaterThanOrEqual(AA_TEXT);
  await page.evaluate(() => { location.hash = "#storms"; });
  await expect(page.locator("#t-chip")).toBeVisible();
  expect(await ratio(page, "#t-chip")).toBeGreaterThanOrEqual(AA_TEXT);
});

// (#100) the skip link used to be routed as an unknown hash and bounced users
// to the Today page. It must keep the current page and move focus to <main>.
for (const [name, path] of [["storms", "/#storms"], ["home", "/"]]) {
  test(`skip link keeps the ${name} page and focuses main`, async ({ page }) => {
    await page.goto(BASE + path, { waitUntil: "load" });
    await expect(page.locator("#banner-title")).not.toHaveText("Checking the skies…", { timeout: 15000 });
    const visibleCards = () => page.evaluate(() =>
      [...document.querySelectorAll(".card[data-page]")].filter((c) => !c.hidden).map((c) => c.id));
    const before = await visibleCards();
    expect(before.length).toBeGreaterThan(0);
    if (name === "storms") expect(await page.locator('.card[data-page="storms"]').first().isVisible()).toBe(true);

    // focus directly: after a /#storms deep link Chrome starts Tab from the fragment target
    await page.locator(".skip-link").focus();
    const hashBefore = await page.evaluate(() => location.hash);
    const histBefore = await page.evaluate(() => history.length);
    await page.keyboard.press("Enter");
    // no hash change, no history entry
    expect(await page.evaluate(() => location.hash)).toBe(hashBefore);
    expect(await page.evaluate(() => history.length)).toBe(histBefore);

    expect(await visibleCards()).toEqual(before);
    if (name === "storms") expect(await page.locator('.card[data-page="storms"]').first().isVisible()).toBe(true);
    else expect(await page.locator("#now").isVisible()).toBe(true);
    await expect(page.locator("main#main")).toBeFocused();
    // focus must be visible for keyboard users
    expect(await page.evaluate(() => getComputedStyle(document.getElementById("main")).outlineStyle)).not.toBe("none");

    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement.closest("main"))).toBe(true);
    expect(await page.evaluate(() => document.activeElement.id)).not.toBe("main");
    await expect(page.locator(":focus")).toBeVisible();
  });
}

// (#100) on mobile the sticky section nav must not cover main's top or the first
// card summary after the skip link scrolls main into view.
test("skip link target is not covered by the sticky nav at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(BASE, { waitUntil: "load" });
  await expect(page.locator("#banner-title")).not.toHaveText("Checking the skies…", { timeout: 15000 });
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.locator(".skip-link").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();
  const r = await page.evaluate(() => {
    const top = (s) => document.querySelector(s).getBoundingClientRect().top;
    return { nav: document.querySelector(".section-nav").getBoundingClientRect().bottom,
      main: top("main"), summary: top("main .card:not([hidden]) .card-toggle") };
  });
  expect(r.main).toBeGreaterThanOrEqual(r.nav);
  expect(r.summary).toBeGreaterThanOrEqual(r.nav);
});

// (#100) the post-first-render re-assert must not scroll to the top. Delay the
// first /api/status so the skip is deterministically made before it lands.
test("skip made before the first status render is not undone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  let release;
  const gate = new Promise((r) => { release = r; });
  await page.route("**/api/status", async (route) => { await gate; await route.continue(); });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.locator(".skip-link").focus();
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  release();
  await expect(page.locator("#banner-title")).not.toHaveText("Checking the skies…", { timeout: 15000 });
  // content grows on render so the exact offset can move; it must not reset to the top
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(page.locator("main#main")).toBeFocused();
});

// (#108) storm-name status must be readable without colour or hover, and the
// "may track very close" note must pass AA. Deterministic: overlay the real
// /api/status response with a fixed season and a close-passing storm.
async function mockSeason(page) {
  await page.route("**/api/status", async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    body.seasonNames = ["Arthur", "Bertha", "Cristobal", "Dolly", "Edouard"];
    body.stormsSoFar = 3; // Arthur, Bertha, Cristobal formed: Dolly is next
    body.storms = [{
      id: "al032026", name: "Cristobal", classification: "Hurricane", intensityKt: 80,
      assessment: { level: "WATCH", distanceNowKm: 900, closestApproachKm: 60, closestApproachInHours: 30,
        method: "official-track", pass: { kind: "direct-hit-risk" } },
    }];
    await route.fulfill({ response: res, json: body });
  });
}

test("storm names are a list with status in text", async ({ page }) => {
  await mockSeason(page);
  await load(page, "light");
  await page.evaluate(() => { location.hash = "#storms"; });
  const items = page.locator("ul#season-names > li.name-chip");
  await expect(items).toHaveCount(5);
  await expect(items.nth(0)).toHaveText(/^Arthur\s*\(used\)$/);
  await expect(items.nth(1)).toHaveText(/^Bertha\s*\(used\)$/);
  await expect(items.nth(2)).toHaveText(/^Cristobal\s*–\s*active now$/);
  await expect(items.nth(3)).toHaveText(/^Dolly\s*–\s*next$/);
  await expect(items.nth(4)).toHaveText(/^Edouard$/);
  await expect(items.nth(4).locator(".name-tag, .sr-only")).toHaveCount(0);
  await expect(items.nth(0)).toHaveClass(/used/);
  await expect(items.nth(1)).toHaveClass(/used/);
  await expect(items.nth(2)).toHaveClass(/active/);
  await expect(items.nth(3)).toHaveClass(/next/);
  // Safari/VoiceOver drops list semantics under list-style:none unless role=list is explicit
  const list = page.locator("#season-names");
  await expect(list).toHaveAttribute("role", "list");
  await expect(page.getByRole("list").filter({ has: page.getByRole("listitem").filter({ hasText: "Arthur" }) }).first()).toBeVisible();
  await expect(list.getByRole("listitem")).toHaveCount(5);
  expect(await page.locator("#season-names [title]").count()).toBe(0);
});

for (const theme of ["light", "dark"]) {
  test(`used storm name and "may track very close" note have AA contrast (${theme})`, async ({ page }) => {
    await mockSeason(page);
    await load(page, theme);
    await page.evaluate(() => { location.hash = "#storms"; });
    await expect(page.locator("#season-names .name-chip.used").first()).toBeVisible();
    expect(await ratio(page, "#season-names .name-chip.used")).toBeGreaterThanOrEqual(AA_TEXT);
    // the helper can't see opacity, which is what used to fade the chip below AA
    expect(await page.locator("#season-names .name-chip.used").first().evaluate((e) => getComputedStyle(e).opacity)).toBe("1");
    // the small "active now" / "next" tags sit on tinted chips
    await expect(page.locator("#season-names .name-chip.active .name-tag")).toBeVisible();
    expect(await ratio(page, "#season-names .name-chip.active .name-tag")).toBeGreaterThanOrEqual(AA_TEXT);
    expect(await ratio(page, "#season-names .name-chip.next .name-tag")).toBeGreaterThanOrEqual(AA_TEXT);
    const note = page.locator("#storms-body small", { hasText: "may track very close" });
    await expect(note).toBeVisible();
    expect(await ratio(page, "#storms-body small.pass-close")).toBeGreaterThanOrEqual(AA_TEXT);
  });
}

// (#107) every card title is an h2 holding the disclosure button so heading
// navigation lists each section; sub-headings sit below it without skipping
const CARD_TITLES = {
  home: ["Right now in", "Rain & wind — next 24 hours", "Things to do in Barbados"],
  forecast: ["Next 7 days"],
  sea: ["Beach, sea & sky"],
  radar: ["Rain radar & satellite"],
  storms: ["Storms & tropics"],
  shelters: ["Emergency & shelters"],
  prep: ["Get ready"],
};

async function openRoute(page, route) {
  await load(page, "light");
  await page.evaluate((h) => { location.hash = h; }, route);
  await expect(page.locator(`.card[data-page="${route}"]`).first()).toBeVisible();
}

for (const [route, titles] of Object.entries(CARD_TITLES)) {
  test(`#${route}: card titles are h2 headings with a toggle button`, async ({ page }) => {
    await openRoute(page, route);
    const found = await page.evaluate((r) =>
      [...document.querySelectorAll(`.card[data-page="${r}"] > h2.card-h`)]
        .filter((h) => h.offsetParent !== null)
        .map((h) => h.textContent.replace(/\s+/g, " ").trim()), route);
    expect(found).toHaveLength(titles.length);
    titles.forEach((t, i) => expect(found[i]).toContain(t));
    // the h2 holds a button whose accessible name is the title
    for (const t of titles) {
      await expect(page.getByRole("heading", { level: 2 }).getByRole("button", { name: t, exact: false }).first()).toBeVisible();
    }
  });

  test(`#${route}: heading levels never skip`, async ({ page }) => {
    await openRoute(page, route);
    const levels = await page.evaluate(() =>
      [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]
        .filter((h) => h.getClientRects().length > 0)
        .map((h) => Number(h.tagName[1])));
    expect(levels[0]).toBe(1);
    levels.forEach((l, i) => { if (i) expect(l - levels[i - 1], `h${l} after h${levels[i - 1]}`).toBeLessThanOrEqual(1); });
  });
}

for (const how of ["click", "Enter", "Space"]) {
  test(`card toggle button opens and closes its body on ${how}`, async ({ page }) => {
    await openRoute(page, "forecast");
    const card = page.locator('.card[data-page="forecast"]').first();
    const btn = card.locator("h2 > button.card-toggle");
    const body = card.locator(".card-body");
    const controls = await btn.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    expect(await page.evaluate((id) => !!document.getElementById(id), controls)).toBe(true);
    expect(await body.getAttribute("id")).toBe(controls);
    const flip = async () => {
      if (how === "click") await btn.click();
      else { await btn.focus(); await page.keyboard.press(how); }
    };
    await expect(btn).toHaveAttribute("aria-expanded", "true");
    await expect(body).toBeVisible();
    await flip();
    await expect(btn).toHaveAttribute("aria-expanded", "false");
    await expect(body).toBeHidden();
    await flip();
    await expect(btn).toHaveAttribute("aria-expanded", "true");
    await expect(body).toBeVisible();
  });
}

test("next Tab after the skip link lands on the first card toggle button", async ({ page }) => {
  await load(page, "light");
  await page.locator(".skip-link").focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => {
    const first = document.querySelector(".card:not([hidden]) > h2 > .card-toggle");
    return !!first && document.activeElement === first;
  })).toBe(true);
});

// A stale cached index.html can still have <details> cards when the new app.js
// runs (#97), so the router must open those instead of throwing.
test("router opens a native <details> card from a stale index.html", async ({ page }) => {
  await load(page, "light");
  const startsOpen = await page.evaluate(() => {
    const d = document.createElement("details");
    d.id = "stale-card"; d.className = "card"; d.dataset.page = "forecast";
    d.innerHTML = "<summary>Old card</summary><p>body</p>";
    document.querySelector("main").append(d);
    return d.open;
  });
  expect(startsOpen).toBe(false);
  // opening goes through the router
  await page.evaluate(() => { location.hash = "forecast"; });
  await page.waitForFunction(() => document.getElementById("stale-card").open === true);
  // closing goes through the shared helper
  await page.evaluate(() => setCardOpen(document.getElementById("stale-card"), false));
  await page.waitForFunction(() => document.getElementById("stale-card").open === false);
});

// (#103) forecast cards: the icon is decorative, so the condition and the
// high/low labels must reach screen readers as visually-hidden text. The
// outlook comes from Open-Meteo upstream, so overlay a fixed one on
// /api/status to make these deterministic (no network needed).
const OUTLOOK = {
  daily: Array.from({ length: 7 }, (_, i) => ({
    date: `2026-11-${String(9 + i).padStart(2, "0")}`, code: 81, description: "Showers",
    maxC: 31, minC: 25, rainProb: 40, thunderProb: 35,
  })),
  // naive island-local times, exactly as the real API sends them (#118)
  hourly: Array.from({ length: 4 }, (_, i) => ({
    time: `2026-11-09T${String(10 + i).padStart(2, "0")}:00`, code: 81, description: "Showers",
    rainProb: 40, windKmh: 16, gustKmh: 20, thunderProb: 0,
  })),
  sources: {},
};

async function loadForecast(page) {
  await page.route("**/api/status", async (route) => {
    const res = await route.fetch();
    await route.fulfill({ json: { ...(await res.json()), outlook: OUTLOOK } });
  });
  await load(page, "light");
  const days = page.locator("#days .day");
  await expect(days).toHaveCount(7);
  return days;
}
// the viewer's timezone must not change what the island hour reads as (#118)
for (const timezoneId of ["UTC", "Europe/London", "America/Barbados"]) {
  test.describe(`hourly labels in ${timezoneId}`, () => {
    test.use({ timezoneId });
    test("naive island times read as island hours", async ({ page }) => {
      await loadForecast(page);
      await expect(page.locator("#hours .hr .t").first()).toHaveText("10am");
    });
  });
}

const text = (loc) => loc.evaluate((el) => el.textContent.replace(/\s+/g, " ").trim());

test("7-day cards expose the condition and High/low labels to screen readers", async ({ page }) => {
  const days = await loadForecast(page);
  expect(await text(days.nth(1))).toMatch(/Showers\. High 31°\s*low 25°.*40% chance of rain.*35% chance of thunderstorms/);
  // the icon stays hidden from assistive tech
  await expect(days.first().locator(".ico")).toHaveAttribute("aria-hidden", "true");
});

test("hourly cards expose the condition and wind to screen readers", async ({ page }) => {
  await loadForecast(page);
  const hrs = page.locator("#hours .hr");
  await expect(hrs).toHaveCount(4);
  expect(await text(hrs.first())).toMatch(/Showers\. .*40% chance of rain, wind 16 km\/h/);
});

test(".sr-only text is visually hidden", async ({ page }) => {
  const days = await loadForecast(page);
  const box = await days.first().locator(".sr-only").first().evaluate((el) => {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return { clip: cs.clip, w: r.width, h: r.height };
  });
  expect(box.clip).not.toBe("auto");
  expect(box.w).toBeLessThanOrEqual(1);
  expect(box.h).toBeLessThanOrEqual(1);
});

test("day card visible text is unchanged by the hidden labels", async ({ page }) => {
  const days = await loadForecast(page);
  // visible = every text node whose parent is not .sr-only
  const visible = await days.nth(1).evaluate((el) => {
    const out = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) if (!n.parentElement.closest(".sr-only")) out.push(n.textContent);
    return out.join(" ").replace(/\s+/g, " ").trim();
  });
  expect(visible).toMatch(/^[A-Z][a-z]{2} \S+ 31° 25° 💧 40% ⚡ 35%$/);
});

// (#103) the same cards through the accessibility tree rather than the DOM:
// textContent would still pass if the labels were hidden from assistive tech.
test("forecast cards expose condition and High/low in the accessibility tree", async ({ page }) => {
  const days = await loadForecast(page);
  // hourly strip is on Today; check it before moving to the forecast page
  await expect(page.locator("#hours .hr").first()).toMatchAriaSnapshot("- text: /10am Showers\\. .*40% chance of rain, wind 16 km\\/h/");
  await page.evaluate(() => { location.hash = "#forecast"; });
  await expect(days.nth(1)).toBeVisible();
  await expect(days.nth(1)).toMatchAriaSnapshot("- text: /Showers\\. High 31° low 25° 40% chance of rain 35% chance of thunderstorms/");
});

// (#104) page changes: focus, aria-current and title
const PAGES = [
  ["home", "Today", /^Bim Weather \| Barbados Weather & Storm Watch$/],
  ["forecast", "7-day", /^7-day forecast \| Bim Weather$/],
  ["sea", "Beach & sea", /^Beach & sea \| Bim Weather$/],
  ["radar", "Radar", /^Radar \| Bim Weather$/],
  ["storms", "Storms", /^Storms \| Bim Weather$/],
  ["shelters", "Shelters", /^Shelters \| Bim Weather$/],
  ["prep", "Get ready", /^Get ready \| Bim Weather$/],
];

// the real card heading button names
const HEADINGS = { forecast: /Next 7 days/, sea: /Beach, sea & sky/, radar: /Rain radar & satellite/, storms: /Storms & tropics/, shelters: /Emergency & shelters/, prep: /Get ready/ };

async function expectPage(page, id, title) {
  await expect(page).toHaveTitle(title);
  const current = page.locator('.section-nav a[aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveAttribute("href", "#" + id);
}

for (const [id, label, title] of PAGES.filter(([id]) => id !== "home")) {
  for (const how of ["click", "Enter"]) {
    test(`${how} on the ${label} nav link focuses the page heading and updates title/aria-current`, async ({ page }) => {
      await page.goto(BASE + "/");
      const link = page.locator(`.section-nav a[href="#${id}"]`);
      if (how === "click") await link.click();
      else { await link.focus(); await page.keyboard.press("Enter"); }
      await expectPage(page, id, title);
      const toggle = page.locator(`.card[data-page="${id}"]:not([hidden]) .card-toggle`).first();
      await expect(toggle).toBeFocused();
      await expect(toggle).toHaveAccessibleName(HEADINGS[id]);
    });
  }
}

test("returning to Today restores the full title and focuses its heading", async ({ page }) => {
  await page.goto(BASE + "/#storms");
  await page.locator('.section-nav a[href="#home"]').click();
  await expectPage(page, "home", PAGES[0][2]);
  await expect(page.locator('.card[data-page="home"] .card-toggle').first()).toBeFocused();
});

test("initial load of /#storms sets title and aria-current without stealing focus", async ({ page }) => {
  await page.goto(BASE + "/#storms");
  await expectPage(page, "storms", /^Storms \| Bim Weather$/);
  // let the first status render (which re-asserts the page) settle
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
});

test("browser Back returns to the previous page and updates title and aria-current", async ({ page }) => {
  await page.goto(BASE + "/");
  await page.locator('.section-nav a[href="#storms"]').click();
  await expectPage(page, "storms", /^Storms \| Bim Weather$/);
  await page.goBack();
  await expectPage(page, "home", PAGES[0][2]);
});

// (#106) Play/Pause buttons: the visible label must be the accessible name
// (WCAG 2.5.3), and the name tracks the state. Radar and satellite upstreams
// are stubbed so both buttons are deterministic.
test("radar and satellite play buttons: visible label is the accessible name", async ({ page }) => {
  const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  await page.route("https://api.rainviewer.com/**", (r) => r.fulfill({
    json: { host: "https://tilecache.rainviewer.com", radar: { past: [{ time: 1, path: "/a" }, { time: 2, path: "/b" }], nowcast: [] } },
  }));
  await page.route("https://tilecache.rainviewer.com/**", (r) => r.fulfill({ body: PNG, contentType: "image/png" }));
  // loop frames are held until released so the transient "Loading loop…" state is observable
  let release; const gate = new Promise((res) => { release = res; });
  await page.route("https://cdn.star.nesdis.noaa.gov/**", async (r) => {
    if (r.request().url().includes("_GOES19-ABI-")) await gate;
    r.fulfill({ body: PNG, contentType: "image/jpeg" });
  });
  await page.goto(BASE, { waitUntil: "load" });
  await page.evaluate(() => { location.hash = "#radar"; });
  const radar = page.locator("#radar-toggle");
  const sat = page.locator("#sat-toggle");
  await expect(sat).toBeVisible();
  // toggleRadar is a no-op until the stubbed frames arrive; showRadarFrame replaces the "—" placeholder
  await expect(page.locator("#radar-time")).not.toHaveText("—");
  await expect(sat).toHaveAccessibleName("Play loop");
  for (const [btn, play, pause] of [[radar, "Play radar", "Pause radar"], [sat, "Play loop", "Pause loop"]]) {
    await expect(btn).not.toHaveAttribute("aria-label", /.*/);
    await expect(btn).toHaveAccessibleName(play); // glyph is aria-hidden, so name starts with the visible text
    await expect(btn.locator("span[aria-hidden=true]")).toHaveCount(1);
    await btn.click();
    if (btn === sat) { await expect(btn).toHaveAccessibleName("Loading loop…"); release(); }
    await expect(btn).toHaveAccessibleName(pause);
    await btn.click();
    await expect(btn).toHaveAccessibleName(play);
  }
});

// (#104) alerts push the layout down: after a nav click the focused heading
// button must still be fully in view (and below the sticky nav on mobile).
for (const [w, h] of [[320, 480], [1280, 500]]) {
  test(`focused page heading stays in view with alerts showing at ${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(BASE, { waitUntil: "load" });
    await expect(page.locator("#banner-title")).not.toHaveText("Checking the skies…", { timeout: 15000 });
    await page.evaluate(() => {
      for (const id of ["civil-alert", "alerts-bar"]) {
        const el = document.getElementById(id);
        el.hidden = false;
        el.textContent = "Test alert. ".repeat(40);
      }
    });
    for (const id of ["storms", "prep"]) {
      await page.locator(`.section-nav a[href="#${id}"]`).click();
      const toggle = page.locator(`.card[data-page="${id}"]:not([hidden]) .card-toggle`).first();
      await expect(toggle).toBeFocused();
      const r = await page.evaluate((id) => {
        const t = document.querySelector(`.card[data-page="${id}"] .card-toggle`).getBoundingClientRect();
        return { top: t.top, bottom: t.bottom, nav: document.querySelector(".section-nav").getBoundingClientRect().bottom,
          vh: innerHeight, mobileNav: document.querySelector(".section-nav").getBoundingClientRect().width > innerWidth / 2 };
      }, id);
      expect(r.top).toBeGreaterThanOrEqual(0);
      expect(r.bottom).toBeLessThanOrEqual(r.vh);
      if (r.mobileNav) expect(r.top).toBeGreaterThanOrEqual(r.nav);
    }
  });
}
