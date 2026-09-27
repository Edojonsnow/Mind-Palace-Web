import { expect, test, type Page } from "@playwright/test";

const hasAuthState = Boolean(process.env.MIND_PALACE_E2E_STORAGE_STATE);

type CreatedThought = {
  id: string;
  body: string;
};

async function openAuthenticatedHome(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "A thought is all it takes." })).toBeVisible({
    timeout: 30_000,
  });
}

async function captureThought(page: Page, body: string): Promise<CreatedThought> {
  await page.getByRole("button", { name: "Save a thought" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder("Start anywhere. You do not need to organize it.").fill(body);
  const useWithAsk = dialog.getByRole("checkbox");
  if (await useWithAsk.isChecked()) {
    await useWithAsk.uncheck();
  }

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/backend/thoughts") &&
      response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Keep this thought" }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Thought saved.")).toBeVisible({ timeout: 30_000 });

  return (await response.json()) as CreatedThought;
}

async function openTrustControls(page: Page) {
  await page.getByRole("button", { name: "Privacy & data" }).click();
  const panel = page.getByRole("dialog", { name: "Privacy & data" });
  await expect(panel).toBeVisible();
  return panel;
}

test.describe("authenticated trust workflows", () => {
  test.skip(
    !hasAuthState,
    "Set MIND_PALACE_E2E_STORAGE_STATE to a disposable authenticated Playwright storage state.",
  );

  test("restores a deleted thought during the recovery window", async ({ page }) => {
    const marker = `Trust restore ${Date.now()}`;
    await openAuthenticatedHome(page);
    const thought = await captureThought(page, marker);

    const deleteResponse = await page.request.delete(`/api/backend/thoughts/${thought.id}`);
    expect(deleteResponse.status()).toBe(204);

    await page.reload();
    const panel = await openTrustControls(page);
    await expect(panel.getByText(marker, { exact: true })).toBeVisible();
    await panel.getByRole("button", { name: "Restore thought" }).click();
    await expect(panel.getByText(marker, { exact: true })).toHaveCount(0, { timeout: 30_000 });
    await expect(panel.getByText("Nothing is waiting to be restored.", { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  });

  test("generates and downloads a JSON export", async ({ page }) => {
    await openAuthenticatedHome(page);
    const panel = await openTrustControls(page);

    await panel.getByRole("button", { name: "Request export" }).click();
    await expect(panel.getByText(/Export status: completed/)).toBeVisible({ timeout: 30_000 });

    const downloadPromise = page.waitForEvent("download");
    await panel.getByRole("button", { name: "Download JSON" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("mind-palace-export.json");
  });

  test("requests and cancels account deletion within the recovery window", async ({ page }) => {
    await openAuthenticatedHome(page);
    const panel = await openTrustControls(page);
    const existingCancelButton = panel.getByRole("button", { name: "Cancel deletion" });
    if (await existingCancelButton.count()) {
      await existingCancelButton.click();
      await expect(panel.getByRole("button", { name: "Request account deletion" })).toBeVisible();
    }

    page.once("dialog", (dialog) => void dialog.accept());
    await panel.getByRole("button", { name: "Request account deletion" }).click();
    await expect(panel.getByRole("button", { name: "Cancel deletion" })).toBeVisible({
      timeout: 30_000,
    });

    await panel.getByRole("button", { name: "Cancel deletion" }).click();
    await expect(panel.getByRole("button", { name: "Request account deletion" })).toBeVisible({
      timeout: 30_000,
    });
  });

  test("disabling AI removes a thought from Ask eligibility", async ({ page }) => {
    const marker = `Trust AI disable ${Date.now()}`;
    await openAuthenticatedHome(page);
    await page.getByRole("button", { name: "Save a thought" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByPlaceholder("Start anywhere. You do not need to organize it.").fill(marker);
    await dialog.getByRole("checkbox").check();

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/backend/thoughts") &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Keep this thought" }).click();
    const createResponse = await responsePromise;
    expect(createResponse.ok()).toBeTruthy();
    const thought = (await createResponse.json()) as CreatedThought;

    const disableResponse = await page.request.patch(`/api/backend/thoughts/${thought.id}`, {
      data: { use_with_ask_my_mind: false },
    });
    expect(disableResponse.ok()).toBeTruthy();
    expect((await disableResponse.json()).ai_processing_status).toBe("not_requested");
  });
});
