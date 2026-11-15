import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:8080";

// (#57) Offline is the headline feature: warm the SW, go offline, reload, and
// the cached shell + last /api/status must still render.
test("(#57) dashboard shell and last status render offline from the SW cache", async ({ page, context, browserName }) => {
  // Playwright WebKit's setOffline makes the offline reload fail with an internal error even for
  // SW-served navigations, so this can only be verified on Chromium.
  test.skip(browserName === "webkit", "Playwright WebKit setOffline breaks SW-served reloads");
  await page.goto(BASE, { waitUntil: "load" });
  await expect(page.locator("#banner-title")).not.toHaveText("Checking the skies…", { timeout: 15000 });
  // SW registered and activated (install precaches the shell; activate claims).
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (reg.active.state !== "activated") {
      await new Promise((ok) => reg.active.addEventListener("statechange", () => reg.active.state === "activated" && ok()));
    }
  });
  // Reload online so the page is SW-controlled and its /api/status fetch is cached.
  await page.reload({ waitUntil: "load" });
  await expect(page.locator("#banner-title")).not.toHaveText("Checking the skies…", { timeout: 15000 });
  expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  await page.reload({ waitUntil: "load" });
  await expect(page.locator(".section-nav")).toBeVisible();
  await expect(page.locator("#banner-title")).not.toHaveText("Checking the skies…", { timeout: 15000 });
  await expect(page.locator("#offline-note")).toBeVisible();
});
