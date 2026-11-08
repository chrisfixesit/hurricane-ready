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
  expect(await page.evaluate(() => document.activeElement.matches(".card:not([hidden]) > h2 > .card-toggle"))).toBe(true);
});
