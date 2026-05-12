const { defineConfig } = require("@playwright/test");

const GATEWAY_PORT = process.env.GATEWAY_PORT || 5000;
const GATEWAY_URL =
  process.env.API_GATEWAY_URL || `http://127.0.0.1:${GATEWAY_PORT}`;

module.exports = defineConfig({
  testDir: "./e2e",
  testMatch: "**/api-contract.spec.js",
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "api-report" }]],
  use: {
    baseURL: GATEWAY_URL,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm start",
    cwd: "../server/api-gateway",
    url: `${GATEWAY_URL}/health`,
    reuseExistingServer: true,
    timeout: 60 * 1000,
  },
});
