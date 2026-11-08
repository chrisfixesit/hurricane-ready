import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:8080";

// Renders the live dashboard (against a running container, ideally in replay
// mode) and asserts every section is populated with real data — so a silent
// frontend break is caught in CI, not by users during a storm.
test("dashboard renders every section with real data", async ({ page }) => {
  // Catch real JS errors; ignore external resource (tile/satellite) hiccups.
  const jsErrors = [];
  page.on("pageerror", (e) => jsErrors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/i.test(m.text())) {
      jsErrors.push(m.text());
    }
  });

  await page.goto(BASE, { waitUntil: "load" });
  // wait for the first /api/status render to land
  await expect(page.locator("#banner-title")).not.toHaveText("Checking the skies…", { timeout: 15000 });

  // Ask the server what's actually reachable before asserting on UI that
  // depends on it — Open-Meteo is sometimes blocked from CI runners, but
  // that's an external-service flake, not a frontend break. Fetched in
  // page context so the relative URL resolves against BASE.
  const health = await page.evaluate(async () => (await fetch("/healthz")).json());

  // Right now / 7-day / hourly / sea: only assert when the upstream
  // weather + outlook services actually came back.
  if (health.hasWeather) {
    await expect(page.locator("#wx-temp")).not.toHaveText("", { timeout: 15000 });
    await expect(page.locator("#now-summary")).toContainText("It's", { timeout: 15000 });
  } else {
    test.info().annotations.push({ type: "skipped", description: "weather upstream unavailable" });
  }
  if (health.hasOutlook) {
    await expect(page.locator("#days .day")).toHaveCount(7);
    expect(await page.locator("#hours .hr").count()).toBeGreaterThan(0);
    expect(await page.locator("#sea-grid .wx-tile").count()).toBeGreaterThan(0);
    expect(await page.locator("#air-grid .wx-tile").count()).toBeGreaterThan(0);
  } else {
    test.info().annotations.push({ type: "skipped", description: "outlook upstream unavailable" });
  }

  // Storms table populated (replay has Beryl), or the empty message is shown and the table hidden.
  // Check the hidden attribute, not visibility: the router hides the whole Storms card on Today.
  if (await page.locator("#storms-body tr").count() === 0) {
    await expect(page.locator("#storms-empty")).not.toHaveAttribute("hidden");
    await expect(page.locator("#storms-table")).toHaveAttribute("hidden");
  } else {
    await expect(page.locator("#storms-table")).not.toHaveAttribute("hidden");
    await expect(page.locator("#storms-empty")).toHaveAttribute("hidden");
  }

  // Season name chips
  expect(await page.locator("#season-names .name-chip").count()).toBeGreaterThan(0);

  // Shelters: emergency numbers + parish filter. The redesign moved sections
  // into a tabbed nav (one .card[data-page] visible at a time), so activate
  // the shelters page before interacting — count/text assertions work on hidden
  // DOM, but selectOption requires the control to be visible.
  await page.locator('.section-nav a[href="#shelters"]').click();
  await expect(page.locator("#parish-select")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".emerg .emerg-num")).toHaveCount(5);
  await page.selectOption("#parish-select", "Christ Church");
  expect(await page.locator("#shelter-list .shelter").count()).toBeGreaterThan(0);

  // Service worker registers (PWA)
  const swOk = await page.evaluate(async () => Boolean(await navigator.serviceWorker.getRegistration()));
  expect(swOk).toBe(true);

  expect(jsErrors, jsErrors.join("\n")).toEqual([]);
});
