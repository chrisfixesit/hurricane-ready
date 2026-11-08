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
  expect(await ratio(page, "#t-uv")).toBeGreaterThanOrEqual(AA_TEXT);
  expect(await ratio(page, "#t-chip")).toBeGreaterThanOrEqual(AA_TEXT);
});
