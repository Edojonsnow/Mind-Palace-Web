import { mkdir } from "node:fs/promises";
import { once } from "node:events";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseURL = process.env.MIND_PALACE_E2E_BASE_URL ?? "http://localhost:3000";
const outputPath = process.env.MIND_PALACE_E2E_STORAGE_STATE ?? "playwright/.auth/mind-palace.json";
const email = process.env.MIND_PALACE_E2E_EMAIL;
const password = process.env.MIND_PALACE_E2E_PASSWORD;

if (Boolean(email) !== Boolean(password)) {
  throw new Error(
    "Set both MIND_PALACE_E2E_EMAIL and MIND_PALACE_E2E_PASSWORD, or omit both for manual sign-in.",
  );
}

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

await page.goto(baseURL);
if (email && password) {
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
} else {
  console.log("Complete sign-in and email confirmation in the opened browser.");
  console.log("Return to this terminal and press Enter after the authenticated home is visible.");
  process.stdin.resume();
  await once(process.stdin, "data");
}

await page.getByRole("heading", { name: "A thought is all it takes." }).waitFor({
  state: "visible",
  timeout: 30_000,
});

await mkdir(path.dirname(outputPath), { recursive: true });
const state = await context.storageState();
if (state.cookies.length === 0 && state.origins.length === 0) {
  throw new Error(
    "No authenticated storage was captured. Complete sign-in in the Playwright browser before pressing Enter.",
  );
}
await context.storageState({ path: outputPath });
await browser.close();
console.log(`Saved Playwright storage state to ${outputPath}`);
