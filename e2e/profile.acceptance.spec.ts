import { expect, test } from "@playwright/test";

test.describe("private profile workspace", () => {
  test.beforeEach(async ({ page }) => {
    let account = { display_name: "Alex", email: "profile@example.test", avatar_url: null };
    let preferences = { use_profile_context: false, writing_style: "natural", response_detail: "balanced", personal_goals: [], interests: [] };
    await page.route("**/api/auth/**", route => {
      const path = new URL(route.request().url()).pathname;
      if (!path.includes("get-session")) return route.fulfill({ json: { success: true } });
      return route.fulfill({ json: {
        user: { id: "profile-test", email: account.email, name: "Alex" },
        session: { id: "profile-session", token: "synthetic-token", userId: "profile-test", expiresAt: "2099-01-01T00:00:00Z" },
      } });
    });
    await page.route("**/api/backend/**", route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/profile/ai-preferences")) {
        if (route.request().method() === "PATCH") preferences = { ...preferences, ...route.request().postDataJSON() };
        return route.fulfill({ json: preferences });
      }
      if (path.endsWith("/profile")) {
        if (route.request().method() === "PATCH") account = { ...account, ...route.request().postDataJSON() };
        return route.fulfill({ json: account });
      }
      return route.fulfill({ json: path.endsWith("/settings") ? { default_use_with_ask_my_mind: false } : path.endsWith("/deletion") ? null : [], headers: { "x-total-count": "0" } });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Profile", exact: true }).click();
    await expect(page.getByLabel("Preferred name")).toBeVisible();
  });

  test("saves account and AI preferences independently and keeps consent off", async ({ page }) => {
    await page.getByLabel("Preferred name").fill("Alexandra");
    await page.getByRole("button", { name: "Save profile", exact: true }).click();
    await expect(page.getByText("Profile saved.", { exact: true })).toBeVisible();
    await page.getByLabel("Personal goals", { exact: true }).fill("Read more\nWrite a book");
    await page.getByLabel("Topics I care about").fill("Literature");
    await page.getByLabel("Writing style").selectOption("formal");
    await page.getByLabel("Response length").selectOption("concise");
    await page.getByRole("button", { name: "Save AI preferences", exact: true }).click();
    await expect(page.getByText("AI preferences saved.", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Use my profile with Ask my mind")).not.toBeChecked();
    await page.getByRole("button", { name: /Return to my mind/ }).click();
    await expect(page.getByText("Hello, Alexandra.")).toBeVisible();
    await page.getByRole("button", { name: "Profile", exact: true }).click();
    await expect(page.getByLabel("Personal goals", { exact: true })).toHaveValue("Read more\nWrite a book");
    await expect(page.getByLabel("Writing style")).toHaveValue("formal");
    await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute("readonly", "");
  });

  test("consent is saved immediately without submitting draft preferences twice", async ({ page }) => {
    await page.getByLabel("Personal goals", { exact: true }).fill("Unsaved goal");
    let patches = 0;
    await page.route("**/api/backend/profile/ai-preferences", async route => {
      if (route.request().method() !== "PATCH") return route.fallback();
      patches++;
      expect(route.request().postDataJSON()).toEqual({ use_profile_context: true });
      await new Promise(resolve => setTimeout(resolve, 300));
      return route.fallback();
    });
    const toggle = page.getByLabel("Use my profile with Ask my mind");
    await toggle.click();
    await expect(toggle).toBeDisabled();
    await expect(page.getByText("Profile context enabled.", { exact: true })).toBeVisible();
    expect(patches).toBe(1);
    await page.unroute("**/api/backend/profile/ai-preferences");
    await toggle.click();
    await expect(page.getByText("Profile context disabled.", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Personal goals", { exact: true })).toHaveValue("Unsaved goal");
  });

  test("reuses the active session when opening and saving Profile", async ({ page }) => {
    await page.getByRole("button", { name: /Return to my mind/ }).click();
    let sessionRequests = 0;
    await page.route("**/api/auth/get-session**", async route => {
      sessionRequests++;
      await route.fulfill({ status: 503, json: { message: "Fresh session request should not be needed" } });
    });
    await page.getByRole("button", { name: "Profile", exact: true }).click();
    await expect(page.getByLabel("Preferred name")).toBeVisible();
    await page.getByLabel("Preferred name").fill("Reused session");
    await page.getByRole("button", { name: "Save profile", exact: true }).click();
    await expect(page.getByText("Profile saved.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Save AI preferences", exact: true }).click();
    await expect(page.getByText("AI preferences saved.", { exact: true })).toBeVisible();
    await page.getByLabel("Use my profile with Ask my mind").click();
    await expect(page.getByText("Profile context enabled.", { exact: true })).toBeVisible();
    expect(sessionRequests).toBe(0);
  });

  test("failed saves preserve drafts and show a recoverable error", async ({ page }) => {
    await page.route("**/api/backend/profile", route => route.request().method() === "PATCH" ? route.fulfill({ status: 503, json: { detail: "Profile service unavailable" } }) : route.fallback());
    await page.getByLabel("Preferred name").fill("Keep my draft");
    await page.getByRole("button", { name: "Save profile", exact: true }).click();
    await expect(page.getByRole("region", { name: "Profile", exact: true }).getByRole("alert")).toContainText("Profile service unavailable");
    await expect(page.getByLabel("Preferred name")).toHaveValue("Keep my draft");
    await expect(page.getByRole("button", { name: "Save profile", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Privacy & data", exact: true }).last().click();
    await expect(page.getByRole("dialog", { name: "Privacy & data" })).toBeVisible();
  });

  test("password reset uses the existing email-code recovery screen", async ({ page }) => {
    await page.getByRole("button", { name: "Reset password", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Choose a new password.", exact: true })).toBeVisible();
    await expect(page.getByLabel("Reset code", { exact: true })).toBeVisible();
    await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
    await expect(page.getByText("Check your email for the password reset code.", { exact: true })).toBeVisible();
  });

  test("profile heading renders immediately while data loads and offers retry", async ({ page }) => {
    await page.getByRole("button", { name: /Return to my mind/ }).click();
    let release: () => void = () => {};
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/api/backend/profile/ai-preferences", async route => {
      await gate;
      await route.fulfill({ status: 503, json: { detail: "Unable to load profile" } });
    });
    await page.getByRole("button", { name: "Profile", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Profile", exact: true })).toBeVisible();
    await expect(page.getByText("Loading your profile...", { exact: true })).toBeVisible();
    release();
    await expect(page.getByRole("region", { name: "Profile", exact: true }).getByRole("alert")).toContainText("Unable to load profile");
    await page.unroute("**/api/backend/profile/ai-preferences");
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(page.getByLabel("Preferred name")).toBeVisible();
  });

  for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
    test(`profile layout at ${width}px in ${theme} theme`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      await expect(page.getByRole("heading", { name: "Profile", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const control of await page.locator("input, select, textarea").all()) {
        if (!(await control.isVisible())) continue;
        const box = await control.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      }
      await page.screenshot({ path: testInfo.outputPath(`profile-${theme}-${width}.png`), fullPage: true });
    });
  }
});

test("Profile refreshes a session that is near expiry before using it", async ({ page }) => {
  let sessionRequests = 0;
  await page.route("**/api/auth/**", route => {
    if (!new URL(route.request().url()).pathname.includes("get-session")) {
      return route.fulfill({ json: { success: true } });
    }
    sessionRequests++;
    return route.fulfill({ json: {
      user: { id: "expiring-profile-test", email: "profile@example.test", name: "Alex" },
      session: { id: "expiring-session", token: sessionRequests > 1 ? "refreshed-synthetic-token" : "synthetic-token", userId: "expiring-profile-test", expiresAt: sessionRequests > 1 ? "2099-01-01T00:00:00Z" : new Date(Date.now() + 20_000).toISOString() },
    } });
  });
  await page.route("**/api/backend/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/profile/ai-preferences")) {
      expect(route.request().headers().authorization).toBe("Bearer refreshed-synthetic-token");
    }
    const data = path.endsWith("/profile/ai-preferences")
      ? { use_profile_context: false, writing_style: "natural", response_detail: "balanced", personal_goals: [], interests: [] }
      : path.endsWith("/profile") ? { display_name: "Alex", email: "profile@example.test", avatar_url: null }
      : path.endsWith("/settings") ? { default_use_with_ask_my_mind: false } : [];
    return route.fulfill({ json: data, headers: { "x-total-count": "0" } });
  });
  await page.goto("/");
  await expect(page.getByText("Hello, Alex.", { exact: true })).toBeVisible();
  // Let the shell's initial requests settle before isolating Profile loading.
  await expect(page.getByRole("heading", { name: "A thought is all it takes.", exact: true })).toBeVisible();
  const before = sessionRequests;
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await expect(page.getByLabel("Preferred name")).toBeVisible();
  expect(sessionRequests).toBeGreaterThan(before);
});
