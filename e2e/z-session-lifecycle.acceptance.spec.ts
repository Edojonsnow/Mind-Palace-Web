import { expect, test } from "@playwright/test";

const hasAuthState = Boolean(process.env.MIND_PALACE_E2E_STORAGE_STATE);

// This file is deliberately ordered after the workflow suites. Signing out
// revokes the disposable session persisted in the shared storage-state file.
test.describe("session lifecycle", () => {
  test.skip(
    !hasAuthState,
    "Set MIND_PALACE_E2E_STORAGE_STATE to a disposable authenticated Playwright storage state.",
  );

  test("signs out and returns to the authentication screen", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByText("Return to your mind.", { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible({ timeout: 30_000 });
  });
});
