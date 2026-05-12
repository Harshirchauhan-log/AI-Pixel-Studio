const { defineConfig, devices } = require("@playwright/test");

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

module.exports = defineConfig({
  testDir: "./e2e",
  testIgnore: "**/api-contract.spec.js",
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120 * 1000,
    env: {
      AUTH_SECRET: "playwright-local-secret-for-e2e-tests-only",
      AUTH_GOOGLE_ID: "playwright-google-client-id",
      AUTH_GOOGLE_SECRET: "playwright-google-client-secret",
      NEXTAUTH_URL: BASE_URL,
      NEXT_PUBLIC_API_URL: "http://localhost:5000",
      PLAYWRIGHT_TEST_AUTH_BYPASS: "1",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
