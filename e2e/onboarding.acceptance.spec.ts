import { expect, test, type Page } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

const privacyHeading = "Your thoughts. Your terms.";
const firstThoughtHeading = "Catch a thought before it slips away.";

async function setupAccount(page: Page, completed = false) {
  const settings = {
    id: "synthetic-settings", user_id: "onboarding-user",
    default_use_with_ask_my_mind: false, store_chat_history: true,
    mobile_offline_cache_enabled: true,
    onboarding_step: "privacy",
    onboarding_completed_at: completed ? "2026-11-21T10:00:00Z" : null as string | null,
  };
  const thoughts: Record<string, unknown>[] = [];
  const actions: string[] = [];
  let failProgress = false;
  let failCapture = false;
  let pauseRefresh = false;
  let captures = 0;
  const privateContentRequests: string[] = [];
  await page.route("**/api/auth/**", route => route.fulfill({ json: {
    token: "synthetic-token",
    user: { id: "onboarding-user", email: "onboarding@example.test", name: "Alex" },
    session: { id: "onboarding-session", token: "synthetic-token", expiresAt: "2099-01-01T00:00:00Z" },
  } }));
  await page.route("**/api/backend/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/settings/onboarding")) {
      const body = request.postDataJSON();
      expect(Object.keys(body)).toEqual(["action"]);
      actions.push(body.action);
      if (failProgress) return route.fulfill({ status: 503, json: {} });
      if (body.action === "continue") settings.onboarding_step = "first_thought";
      if (body.action === "skip") settings.onboarding_completed_at = "2026-11-21T10:00:00Z";
      return route.fulfill({ json: settings });
    }
    if (path.endsWith("/settings")) return route.fulfill({ json: settings });
    if (path.endsWith("/settings/ai-usage")) return route.fulfill({ json: {
      usage_date: "2026-11-21", resets_at: "2026-11-22T00:00:00Z", daily_limit: 100,
      remaining_units: 100, units_used: 0, ask_count: 0, search_count: 0, organization_count: 0,
    } });
    if (path.endsWith("/thoughts") && request.method() === "POST") {
      captures += 1;
      if (failCapture) return route.fulfill({ status: 503, json: {} });
      const input = request.postDataJSON();
      expect(input.use_with_ask_my_mind).toBe(false);
      const saved = {
        ...input, id: "first-thought", ai_processing_status: "not_requested",
        source_type: "self", storage_scope: "cloud", is_archived: false,
        created_at: "2026-11-21T10:00:00Z", updated_at: "2026-11-21T10:00:00Z",
        deleted_at: null, metadata_record: null, collections: [],
      };
      thoughts.push(saved);
      settings.onboarding_completed_at = "2026-11-21T10:00:00Z";
      return route.fulfill({ status: 201, json: saved });
    }
    if (path.endsWith("/thoughts")) {
      if (pauseRefresh) await new Promise(resolve => setTimeout(resolve, 1500));
      return route.fulfill({ json: thoughts, headers: {
        "X-Total-Count": String(thoughts.length), "X-Total-Pages": "1",
      } });
    }
    if (/\/ask|\/organize|\/ai-preferences/.test(path) && request.method() !== "GET") {
      privateContentRequests.push(path);
    }
    if (path.endsWith("/profile/ai-preferences")) return route.fulfill({ json: {
      use_profile_context: false, writing_style: "natural", response_detail: "balanced",
      personal_goals: [], interests: [],
    } });
    if (path.endsWith("/profile")) return route.fulfill({ json: {
      display_name: "Alex", email: "onboarding@example.test", avatar_url: null,
    } });
    return route.fulfill({ json: path.endsWith("/deletion") ? null : [] });
  });
  return {
    settings, actions, privateContentRequests,
    failProgress: (value: boolean) => { failProgress = value; },
    failCapture: (value: boolean) => { failCapture = value; },
    pauseRefresh: () => { pauseRefresh = true; },
    captures: () => captures,
  };
}

test("new users resume setup and save a real first thought without enabling AI", async ({ page }) => {
  const account = await setupAccount(page);
  await page.goto("/");
  const setup = page.getByRole("region", { name: privacyHeading });
  await expect(setup).toContainText("not end-to-end encrypted");
  await expect(setup).toContainText("the service can read your saved thoughts");
  await expect(setup).toContainText("AI starts off");
  await expect(setup).toContainText("external AI provider");
  await expect(setup).toContainText("recovery window");
  await setup.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: firstThoughtHeading })).toBeVisible();
  await expect(page.getByRole("region", { name: firstThoughtHeading })).toContainText("group it into a collection");
  await page.reload();
  await expect(page.getByRole("heading", { name: firstThoughtHeading })).toBeFocused();
  await page.getByRole("button", { name: "Save a thought", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Let Ask Omini use this" })).not.toBeChecked();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("heading", { name: firstThoughtHeading })).toBeVisible();
  await page.getByRole("button", { name: "Save a thought", exact: true }).click();
  await page.getByLabel("Your thought", { exact: true }).fill("A synthetic first note.");
  await page.getByLabel("Optional title", { exact: true }).fill("First saved thought");
  account.pauseRefresh();
  await page.getByRole("button", { name: "Keep this thought" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open thought: First saved thought", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: firstThoughtHeading })).toHaveCount(0);
  expect(account.settings.default_use_with_ask_my_mind).toBe(false);
  expect(account.privateContentRequests).toHaveLength(0);
  expect(account.captures()).toBe(1);
  await page.reload();
  await expect(page.getByRole("button", { name: "Open thought: First saved thought", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Skip setup", exact: true })).toHaveCount(0);
});

test("skip persists and existing users are not interrupted", async ({ page }) => {
  const account = await setupAccount(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Skip setup", exact: true }).click();
  await expect(page.getByRole("searchbox", { name: "Search your mind" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("searchbox", { name: "Search your mind" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Skip setup", exact: true })).toHaveCount(0);
  expect(account.actions).toEqual(["skip"]);
  expect(account.privateContentRequests).toHaveLength(0);
});

test("failed progress and capture can be retried without losing the draft", async ({ page }) => {
  const account = await setupAccount(page);
  account.failProgress(true);
  await page.goto("/");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("region", { name: privacyHeading }).getByRole("alert")).toContainText("could not complete this request");
  await expect(page.getByRole("heading", { name: privacyHeading })).toBeVisible();
  account.failProgress(false);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: firstThoughtHeading })).toBeVisible();
  await page.getByRole("button", { name: "Save a thought", exact: true }).click();
  await page.getByLabel("Your thought", { exact: true }).fill("A draft that survives failure.");
  account.failCapture(true);
  const failedSave = page.waitForResponse(response =>
    new URL(response.url()).pathname.endsWith("/thoughts")
    && response.request().method() === "POST" && response.status() === 503,
  );
  await page.getByRole("button", { name: "Keep this thought" }).click();
  await failedSave;
  await expect(page.getByRole("button", { name: "Keep this thought" })).toBeEnabled();
  await expect(page.getByLabel("Your thought", { exact: true })).toHaveValue("A draft that survives failure.");
  expect(account.settings.onboarding_completed_at).toBeNull();
  account.failCapture(false);
  await page.getByRole("button", { name: "Keep this thought" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(account.captures()).toBe(2);
});

test("profile setup is optional and does not enable personalization", async ({ page }) => {
  const account = await setupAccount(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Set up profile (optional)", exact: true }).click();
  await expect(page.getByRole("region", { name: "Profile", exact: true })).toBeVisible();
  await expect(page.getByLabel("Use my profile with Ask Omini")).not.toBeChecked();
  expect(account.privateContentRequests).toHaveLength(0);
});

for (const width of [320, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`setup works at ${width}px in ${theme} theme`, async ({ page }, testInfo) => {
      await setupAccount(page);
      await page.addInitScript(value => localStorage.setItem("mind-palace-theme", value), theme);
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expect(page.getByRole("heading", { name: privacyHeading })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const brand = await page.locator('[data-onboarding="true"] .mp-wordmark').boundingBox();
      const themeButton = await page.getByRole("button", { name: /Theme:/ }).boundingBox();
      expect(brand && themeButton && (brand.x + brand.width <= themeButton.x || brand.y + brand.height <= themeButton.y)).toBeTruthy();
      await page.screenshot({ path: testInfo.outputPath(`onboarding-${theme}-${width}.png`), fullPage: true });
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await expect(page.getByRole("button", { name: "Set up profile (optional)", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`first-thought-${theme}-${width}.png`), fullPage: true });
    });
  }
}
