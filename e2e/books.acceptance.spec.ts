import { expect, test } from "@playwright/test";

const hasAuthState = Boolean(process.env.MIND_PALACE_E2E_STORAGE_STATE);

test.describe("authenticated Books workflows", () => {
  test.skip(
    !hasAuthState,
    "Set MIND_PALACE_E2E_STORAGE_STATE to a disposable authenticated Playwright storage state.",
  );

  test("creates an excerpt, finds its book, and opens the saved thought", async ({ page }) => {
    const bookTitle = `Acceptance book ${Date.now()}`;
    const bookAuthor = "Acceptance author";
    const thoughtTitle = "Acceptance excerpt";
    const thoughtBody = `A saved passage for the Books workspace. ${Date.now()}`;
    let thoughtId: string | undefined;

    try {
      await page.goto("/");
      await expect(page.getByRole("search")).toBeVisible({ timeout: 30_000 });

      await page.getByRole("button", { name: "Save a thought", exact: true }).first().click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog.getByPlaceholder("Start anywhere. You do not need to organize it.").fill(thoughtBody);
      await dialog.getByLabel("Optional title", { exact: true }).fill(thoughtTitle);
      await dialog.getByLabel("Kind of thought", { exact: true }).selectOption("book_excerpt");
      await dialog.getByLabel("Book", { exact: true }).selectOption("__new__");
      await dialog.getByLabel("Book title", { exact: true }).fill(bookTitle);
      await dialog.getByLabel("Author", { exact: true }).fill(bookAuthor);

      await dialog.getByRole("checkbox", { name: "Let Ask My Mind use this", exact: true }).uncheck();

      const bookResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/backend/books") &&
          response.request().method() === "POST",
      );
      const thoughtResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/backend/thoughts") &&
          response.request().method() === "POST",
      );
      await dialog.getByRole("button", { name: /Keep this thought/ }).click();

      const [bookResponse, thoughtResponse] = await Promise.all([
        bookResponsePromise,
        thoughtResponsePromise,
      ]);
      expect(thoughtResponse.ok()).toBeTruthy();
      thoughtId = ((await thoughtResponse.json()) as { id: string }).id;
      expect(bookResponse.ok()).toBeTruthy();
      await expect(dialog).toBeHidden();
      await expect(page.getByText("Thought saved.", { exact: true })).toBeVisible({ timeout: 30_000 });

      await page.getByRole("button", { name: "Books", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Books", exact: true })).toBeVisible();
      const bookRow = page.getByRole("button").filter({
        has: page.getByText(bookTitle, { exact: true }),
      });
      await expect(bookRow).toBeVisible({ timeout: 30_000 });
      await expect(bookRow.getByText("1 excerpt", { exact: true })).toBeVisible();

      await page.getByLabel("Search books", { exact: true }).fill(bookTitle);
      await expect(page.getByText(bookTitle, { exact: true })).toBeVisible();
      await bookRow.click();

      await expect(page.getByRole("heading", { name: bookTitle, exact: true })).toBeVisible();
      await expect(page.getByText("Saved excerpts", { exact: true })).toBeVisible();
      await expect(page.getByText(thoughtTitle, { exact: true })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(thoughtBody, { exact: true })).toBeVisible();

      await page.getByText(thoughtBody, { exact: true }).click();
      const preview = page.getByRole("dialog", { name: "Thought preview" });
      await expect(preview).toBeVisible();
      await expect(preview.getByText(thoughtBody, { exact: true })).toBeVisible();
      await expect(preview.getByText(`${bookTitle} · ${bookAuthor}`, { exact: true })).toBeVisible();
    } finally {
      if (thoughtId) {
        const response = await page.request.delete(`/api/backend/thoughts/${thoughtId}`);
        expect(response.ok()).toBeTruthy();
      }
    }
  });
});
