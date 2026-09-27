import { test, expect } from "@playwright/test";

const hasAuthState = Boolean(process.env.MIND_PALACE_E2E_STORAGE_STATE);
const runAiScenarios = process.env.MIND_PALACE_E2E_AI === "true";

test.describe("authenticated Mind Palace MVP", () => {
  test.skip(
    !hasAuthState,
    "Set MIND_PALACE_E2E_STORAGE_STATE to a disposable authenticated Playwright storage state.",
  );

  test("renders the private home and primary actions", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "A thought is all it takes." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save a thought" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Recall" })).toBeVisible();
    await expect(page.getByRole("button", { name: "View thoughts" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Privacy & data" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("captures a thought with AI disabled and finds it in Recall", async ({ page }) => {
    const marker = `Acceptance capture ${Date.now()}`;
    await page.goto("/");
    await page.getByRole("button", { name: "Save a thought" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder("Start anywhere. You do not need to organize it.").fill(marker);
    const useWithAsk = dialog.getByRole("checkbox");
    if (await useWithAsk.isChecked()) {
      await useWithAsk.uncheck();
    }
    await dialog.getByRole("button", { name: "Keep this thought" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Thought saved.")).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Recall" }).click();
    await page.getByPlaceholder("What do you remember?").fill(marker);
    await page.getByRole("button", { name: "Search memory" }).click();
    await expect(page.getByText(marker)).toBeVisible();
    await expect(page.getByText("Organizing...", { exact: true })).toHaveCount(0);
  });

  test("applies and clears Recall filters", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Recall" }).click();

    await page.getByLabel("Tag").fill("acceptance-filter");
    await page.getByRole("button", { name: "Search memory" }).click();
    await expect(page.getByText("Active filters")).toBeVisible();
    await expect(page.getByText("Tag: acceptance-filter")).toBeVisible();

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.getByText("Active filters")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Clear filters" })).toBeDisabled();
  });

});

test.describe("AI-assisted MVP scenarios", () => {
  test.skip(
    !hasAuthState || !runAiScenarios,
    "Set MIND_PALACE_E2E_STORAGE_STATE and MIND_PALACE_E2E_AI=true to run AI-backed acceptance scenarios.",
  );

  test("captures an AI-enabled thought and exposes Ask My Mind", async ({ page }) => {
    const marker = `Acceptance AI capture ${Date.now()}`;
    await page.goto("/");
    await page.getByRole("button", { name: "Save a thought" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByPlaceholder("Start anywhere. You do not need to organize it.").fill(marker);
    await dialog.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: "Keep this thought" }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "Recall" }).click();
    await page.getByPlaceholder("What do you remember?").fill(marker);
    await page.getByRole("button", { name: "Search memory" }).click();
    await expect(page.getByText(marker)).toBeVisible();
    await expect(page.getByText("Organizing...", { exact: true })).toHaveCount(0, { timeout: 60_000 });

    await page.getByRole("button", { name: "Return to my mind" }).click();
    await expect(page.getByRole("button", { name: "Ask my mind" })).toBeVisible();
    await page.getByRole("button", { name: "Ask my mind" }).click();
    await page.getByPlaceholder("Ask something only your mind could answer…").fill("What did I just capture?");
    await page.getByRole("button", { name: "Ask →" }).click();
    await expect(page.getByText(/Sources \/ [1-9]\d*/)).toBeVisible({ timeout: 30_000 });
  });

});

test.describe("session lifecycle", () => {
  test.skip(
    !hasAuthState,
    "Set MIND_PALACE_E2E_STORAGE_STATE to a disposable authenticated Playwright storage state.",
  );

  test("signs out and returns to the authentication screen", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByText("Return to your mind.", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible({ timeout: 30_000 });
  });
});
