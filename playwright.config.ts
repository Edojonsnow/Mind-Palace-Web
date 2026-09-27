import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.MIND_PALACE_E2E_BASE_URL ?? "http://localhost:3000";
const storageState = process.env.MIND_PALACE_E2E_STORAGE_STATE;
const reuseExistingServer = process.env.MIND_PALACE_E2E_REUSE_SERVER === "true";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // The authenticated acceptance suite intentionally shares one disposable
  // Neon Auth session. Keep it serial so sign-out can run only after the
  // workflows that need that session.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL,
    ...storageState ? { storageState } : {},
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: process.env.MIND_PALACE_E2E_NO_WEBSERVER === "true" ? undefined : {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${new URL(baseURL).port || "3000"}`,
    url: baseURL,
    reuseExistingServer,
    timeout: 120_000,
  },
});
