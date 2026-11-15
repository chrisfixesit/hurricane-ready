import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:8080";

const OUTLOOK = {
  daily: Array.from({ length: 7 }, (_, i) => ({
    date: `2026-11-${String(9 + i).padStart(2, "0")}`, code: 81, description: "Showers",
    maxC: 31, minC: 25, rainProb: 40, thunderProb: 35,
  })),
  hourly: Array.from({ length: 4 }, (_, i) => ({
    time: `2026-11-09T${String(10 + i).padStart(2, "0")}:00`, code: 81, description: "Showers",
    rainProb: 40, windKmh: 16, gustKmh: 20, thunderProb: 40,
  })),
  sources: {},
};
const withOutlook = (page, extra = {}) => page.route("**/api/status", async (route) => {
  const res = await route.fetch();
  await route.fulfill({ json: { ...(await res.json()), outlook: OUTLOOK, ...extra } });
});

async function load(page, path = "") {
  await page.goto(BASE + path, { waitUntil: "load" });
  await expect(page.locator("#banner-title")).not.toHaveText("Checking the skies…", { timeout: 15000 });
}

test("(#146) manifest does not lock orientation", async ({ request }) => {
  const m = await (await request.get(BASE + "/manifest.webmanifest")).json();
  expect(m).not.toHaveProperty("orientation");
});

test("(#147) advisory card is gone; Local advisories lives in Official sources", async ({ page }) => {
  await load(page);
  await expect(page.locator(".advisory-link")).toHaveCount(0);
  const link = page.locator(".sources a.source", { hasText: "Local advisories" });
  await expect(link).toHaveCount(1);
  expect(await link.getAttribute("href")).toContain("barbadosweather.org");
});

test("(#147) nothing between the alerts bar and the section nav links to barbadosweather.org (phone)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await load(page);
  const hits = await page.evaluate(() => {
    const bar = document.querySelector(".alerts-btn, #alerts-btn, .alerts-bar");
    const nav = document.querySelector("nav");
    const out = [];
    for (const a of document.querySelectorAll('a[href*="barbadosweather.org"]')) {
      const afterBar = !bar || !!(bar.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING);
      const beforeNav = !!(nav.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_PRECEDING);
      if (afterBar && beforeNav) out.push(a.outerHTML.slice(0, 80));
    }
    return out;
  });
  expect(hits).toEqual([]);
});

const GLYPHS = /[▾▶⏸ⓘ💧⚡♿✨]/;

test("(#148) no text-glyph or emoji interface icons in the rendered DOM", async ({ page }) => {
  await withOutlook(page, { briefingSource: "claude" });
  await load(page, "/#shelters");
  await expect(page.locator("#hours .hr")).toHaveCount(4);
  await page.locator("#parish-select").selectOption("Christ Church");
  const text = await page.evaluate(() => document.body.textContent);
  expect(text.match(GLYPHS)?.[0] ?? null).toBeNull();
  const before = await page.evaluate(() => getComputedStyle(document.querySelector(".explain summary"), "::before").content);
  expect(before).not.toContain("ⓘ");
  await expect(page.locator(".card-toggle .chev svg.ic").first()).toBeAttached();
  expect(await page.locator(".card-toggle .chev").count()).toBe(await page.locator(".card-toggle .chev svg.ic").count());
  await expect(page.locator("#radar-toggle svg.ic")).toHaveCount(1);
  await expect(page.locator("#sat-toggle svg.ic")).toHaveCount(1);
  await expect(page.locator("#hours .hr .r svg.ic, #hours .hr svg.ic").first()).toBeAttached();
  await expect(page.locator("#days .day .th svg.ic").first()).toBeAttached();
  await expect(page.locator("#hours .hr .th svg.ic").first()).toBeAttached();
  await expect(page.locator(".s-wc svg.ic").first()).toBeAttached();
  await expect(page.locator(".civil-alert .ca-arrow svg.ic")).toHaveCount(1);
});

test("(#148) radar toggle keeps its accessible name when playing", async ({ page }) => {
  await load(page, "/#radar");
  const btn = page.locator("#radar-toggle");
  await expect(btn).toHaveAccessibleName("Play radar");
});

test("(#149) card titles, th and day names are not uppercased; tile labels are", async ({ page }) => {
  await withOutlook(page);
  await load(page);
  const tt = (sel) => page.locator(sel).first().evaluate((e) => getComputedStyle(e).textTransform);
  expect(await tt(".card-toggle")).toBe("none");
  expect(await tt(".card-body > h3")).toBe("none");
  expect(await tt("th")).toBe("none");
  await page.waitForSelector("#days .day .dow");
  expect(await tt(".day .dow")).toBe("none");
  expect(await tt(".emerg-num small")).toBe("none");
  expect(await tt(".wx-tile .lbl")).toBe("uppercase");
});

test("(#149) no touch-only 'tap' wording in visible copy", async ({ page }) => {
  await load(page);
  const t = await page.evaluate(() => document.body.innerText);
  expect(t).not.toMatch(/\btap\b/i);
  const html = await page.evaluate(() => document.body.textContent);
  expect(html).not.toMatch(/\btap\b/i);
});
