import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:8083";

export default defineConfig({
  testDir: ".",
  testIgnore: ["**/._*", "**/.DS_Store"],
  testMatch: ["**/*.spec.ts"],
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "iPhone 14 (mobile-web)",
      use: { ...devices["iPhone 14"] },
    },
    {
      name: "Pixel 7 (mobile-web)",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
