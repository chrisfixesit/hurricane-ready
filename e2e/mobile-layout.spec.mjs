import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:8080";
const PAGES = ["home", "forecast", "sea", "radar", "storms", "shelters", "prep"];

test.use({ viewport: { width: 390, height: 844 } });

// (#57) Phone layout: every section in the nav is reachable and visible, and
// no page scrolls sideways.
test("(#57) every section is reachable at 390x844 with no horizontal scroll", async ({ page }) => {
  await page.goto(BASE, { waitUntil: "load" });
  await expect(page.locator("#banner-title")).not.toHaveText("Checking the skies…", { timeout: 15000 });
  const links = page.locator(".section-nav a");
  expect(await links.evaluateAll((as) => as.map((a) => a.getAttribute("href").slice(1)))).toEqual(PAGES);
  for (const id of PAGES) {
    await page.locator(`.section-nav a[href="#${id}"]`).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`.section-nav a[href="#${id}"]`)).toHaveClass(/active/);
    await expect(page.locator(`.card[data-page="${id}"]:visible`).first()).toBeVisible();
    const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
    expect(w.sw, `#${id} scrollWidth ${w.sw} > innerWidth ${w.iw}`).toBeLessThanOrEqual(w.iw);
  }
});
