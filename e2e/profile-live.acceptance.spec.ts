import { expect, test } from "@playwright/test";
import type { AIPreferences, Profile } from "../src/lib/api";

test.describe("authenticated profile persistence", () => {
  test.skip(!process.env.MIND_PALACE_E2E_STORAGE_STATE, "Authenticated storage state is required.");

  test("persists account and preferences across reload and restores original data", async ({ page }) => {
    // Multiple live Neon round trips and cleanup share this test's total budget.
    test.slow();
    await page.goto("/");
    await expect(page.getByRole("search")).toBeVisible();
    const sessionResponse = await page.request.get("/api/auth/get-session?disableCookieCache=true");
    expect(sessionResponse.ok()).toBe(true);
    const session = await sessionResponse.json();
    const headers = { Authorization: `Bearer ${session.session.token}` };
    const accountResponse = await page.request.get("/api/backend/profile", { headers });
    const preferenceResponse = await page.request.get("/api/backend/profile/ai-preferences", { headers });
    expect(accountResponse.ok()).toBe(true);
    expect(preferenceResponse.ok()).toBe(true);
    const originalAccount = await accountResponse.json() as Profile;
    const originalAI = await preferenceResponse.json() as AIPreferences;
    try {
      await page.getByRole("button", { name: "Profile", exact: true }).click();
      await page.getByLabel("Preferred name").fill("Acceptance Profile");
      await page.getByRole("button", { name: "Save profile", exact: true }).click();
      await expect(page.getByText("Profile saved.", { exact: true })).toBeVisible();
      await page.getByLabel("Personal goals", { exact: true }).fill("A synthetic acceptance goal");
      await page.getByLabel("Topics I care about").fill("Acceptance testing");
      await page.getByLabel("Response length").selectOption("concise");
      await page.getByRole("button", { name: "Save AI preferences", exact: true }).click();
      await expect(page.getByText("AI preferences saved.", { exact: true })).toBeVisible();
      const toggle = page.getByLabel("Use my profile with Ask my mind");
      if (await toggle.isChecked()) await toggle.click();
      await expect(toggle).not.toBeChecked();
      await toggle.click();
      await expect(page.getByText("Profile context enabled.", { exact: true })).toBeVisible();
      await toggle.click();
      await expect(page.getByText("Profile context disabled.", { exact: true })).toBeVisible();
      await page.reload();
      await page.getByRole("button", { name: "Profile", exact: true }).click();
      await expect(page.getByLabel("Preferred name")).toHaveValue("Acceptance Profile");
      await expect(page.getByLabel("Personal goals", { exact: true })).toHaveValue("A synthetic acceptance goal");
      await expect(page.getByLabel("Response length")).toHaveValue("concise");
      await expect(page.getByLabel("Use my profile with Ask my mind")).not.toBeChecked();
    } finally {
      const restoredAccount = await page.request.patch("/api/backend/profile", { headers, data: {
        display_name: originalAccount.display_name, avatar_url: originalAccount.avatar_url,
      } });
      const restoredPreferences = await page.request.patch("/api/backend/profile/ai-preferences", { headers, data: {
        use_profile_context: originalAI.use_profile_context,
        writing_style: originalAI.writing_style,
        response_detail: originalAI.response_detail,
        personal_goals: originalAI.personal_goals,
        interests: originalAI.interests,
      } });
      expect(restoredAccount.ok()).toBe(true);
      expect(restoredPreferences.ok()).toBe(true);
    }
  });
});
