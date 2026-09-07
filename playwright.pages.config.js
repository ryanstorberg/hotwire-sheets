import { defineConfig, devices } from "@playwright/test";
import { pagesBasePath } from "./scripts/pages-config.mjs";

const baseURL = process.env.PAGES_URL || `http://127.0.0.1:4174${pagesBasePath}`;
export default defineConfig({
  testDir: "test/pages", timeout: 120000, workers: 2,
  use: { baseURL, trace: "retain-on-failure" },
  webServer: process.env.PAGES_URL ? undefined : {
    command: "npm run preview:pages", url: baseURL, reuseExistingServer: !process.env.CI
  },
  projects: [
    { name: "pages-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "pages-mobile-webkit", use: { ...devices["iPhone 13"] } }
  ]
});
