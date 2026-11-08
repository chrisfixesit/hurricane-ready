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
      main: top("main"), summary: top("main .card:not([hidden]) summary") };
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

// (#103) forecast cards: the icon is decorative, so the condition and the
// high/low labels must reach screen readers as visually-hidden text. The
// outlook comes from Open-Meteo upstream, so overlay a fixed one on
// /api/status to make these deterministic (no network needed).
const OUTLOOK = {
  daily: Array.from({ length: 7 }, (_, i) => ({
    date: `2026-11-${String(9 + i).padStart(2, "0")}`, code: 81, description: "Showers",
    maxC: 31, minC: 25, rainProb: 40, thunderProb: 35,
  })),
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
