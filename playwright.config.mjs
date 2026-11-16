import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0, // (#57) a flake shouldn't be a red in CI
  reporter: "line",
  use: {
    headless: true,
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    // (#57) Barbadians use this on mobile Safari. Contrast/a11y specs are tuned
    // for desktop Chromium, so WebKit only runs the shell/offline/layout specs.
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 13"] },
      testMatch: ["smoke.spec.mjs", "offline.spec.mjs", "mobile-layout.spec.mjs"],
    },
  ],
});
