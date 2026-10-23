import { expect, test, type Page } from "@playwright/test";

const hasAuthState = Boolean(process.env.MIND_PALACE_E2E_STORAGE_STATE);

async function openAuthenticatedHome(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("search")).toBeVisible({ timeout: 30_000 });
}

async function createCollection(page: Page, name: string): Promise<string> {
  await page.getByRole("button", { name: "Collections", exact: true }).click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitem", { name: "New collection", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Collections", exact: true })).toBeVisible();
  await page.getByLabel("Collection name", { exact: true }).fill(name);

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/backend/collections") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create", exact: true }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  await expect(page.getByText(name, { exact: true })).toBeVisible();

  return ((await response.json()) as { id: string }).id;
}

async function captureThoughtInCollection(
  page: Page,
  body: string,
  collectionName: string,
): Promise<{ id: string; collection_ids: string[] }> {
  await page.getByRole("button", { name: "Return to my mind" }).click();
  await page.getByRole("button", { name: "Save a thought", exact: true }).first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder("Start anywhere. You do not need to organize it.").fill(body);
  await dialog.getByRole("checkbox", { name: collectionName, exact: true }).check();

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/backend/thoughts") &&
      response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Keep this thought" }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Thought saved.", { exact: true })).toBeVisible({ timeout: 30_000 });

  return (await response.json()) as { id: string; collection_ids: string[] };
}

test.describe("authenticated Collections workflows", () => {
  test.skip(
    !hasAuthState,
    "Set MIND_PALACE_E2E_STORAGE_STATE to a disposable authenticated Playwright storage state.",
  );

  test("creates, assigns, opens, removes, and deletes a collection safely", async ({ page }) => {
    const initialName = `Acceptance collection ${Date.now()}`;
    const renamedName = `${initialName} renamed`;
    const marker = `Acceptance collection thought ${Date.now()}`;
    let collectionId: string | undefined;
    let collectionDeleted = false;

    try {
      await openAuthenticatedHome(page);
      collectionId = await createCollection(page, initialName);

      await page.getByRole("button", { name: `Rename ${initialName}`, exact: true }).click();
      await page.getByLabel("Collection name", { exact: true }).fill(renamedName);
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await expect(page.getByText(renamedName, { exact: true })).toBeVisible();

      const thought = await captureThoughtInCollection(page, marker, renamedName);
      expect(thought.collection_ids).toContain(collectionId);
      await expect(page.getByText(marker, { exact: true })).toBeVisible();

      await page.getByRole("button", { name: "Collections", exact: true }).click();
      const menu = page.getByRole("menu");
      await expect(menu.getByRole("menuitem", { name: "View all collections", exact: true })).toBeVisible();
      expect(await menu.getByRole("menuitem").count()).toBeLessThanOrEqual(7);
      await menu.getByRole("menuitem", { name: renamedName, exact: false }).click();

      await expect(page.getByRole("heading", { name: renamedName, exact: true })).toBeVisible();
      await expect(page.getByText(marker, { exact: true })).toBeVisible();

      await page.getByRole("button", { name: `Remove thought from ${renamedName}`, exact: true }).click();
      await expect(page.getByText(marker, { exact: true })).toHaveCount(0);
      await expect(page.getByText("This collection is ready for its first thought.", { exact: true })).toBeVisible();

      await page.getByRole("button", { name: "All collections", exact: true }).click();
      page.once("dialog", (dialog) => void dialog.accept());
      await page.getByRole("button", { name: `Delete ${renamedName}`, exact: true }).click();
      collectionDeleted = true;
      await expect(page.getByText(renamedName, { exact: true })).toHaveCount(0);

      await page.getByRole("button", { name: "Return to my mind" }).click();
      await expect(page.getByText(marker, { exact: true })).toBeVisible();
    } finally {
      if (collectionId && !collectionDeleted) {
        await page.request.delete(`/api/backend/collections/${collectionId}`);
      }
    }
  });

  test("keeps generated categories out of the visible View experience", async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.getByRole("button", { name: "View thoughts", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Patterns, without the filing.", exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("button", { name: "Open Tags", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open Books", exact: true })).toBeVisible();
    await expect(page.getByText("Themes", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Emotions", { exact: true })).toHaveCount(0);
    await expect(page.getByText("People", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Open Tags", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Tags", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "All categories", exact: true })).toBeVisible();
  });
});
