import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("public website explains the current product without requesting private data", async ({ page }) => {
  const privateRequests: string[] = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname.startsWith("/api/")) privateRequests.push("api-request");
  });
  await page.goto("/about");
  await expect(page.getByRole("heading", { name: "Mind Palace", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Mind Palace", exact: true }).first()).toHaveAttribute("href", "/");
  await expect(page.getByText("This is not end-to-end encrypted storage.", { exact: false })).toBeVisible();
  const tabs = page.getByRole("tablist", { name: "Explore Mind Palace" });
  await tabs.getByRole("tab", { name: "Save a thought", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(tabs.getByRole("tab", { name: "Keep a passage", exact: true })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("A bookshelf made of what stayed with you.");
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("tabpanel")).toContainText("Questions, with somewhere to return to.");
  await page.getByText("Do I have to use AI?", { exact: true }).click();
  await expect(page.getByText("No. You can save, edit, browse", { exact: false })).toBeVisible();
  expect(privateRequests).toHaveLength(0);
});

for (const width of [320, 375, 414, 768, 1440]) {
  test(`product website fits and renders images at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/about");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { name: "Mind Palace", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();

    for (const tab of await page.getByRole("tab").all()) {
      await tab.click();
      const image = page.getByRole("tabpanel").locator("img");
      await expect(image).toBeVisible();
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBeTruthy();
    }
    await page.getByRole("tab", { name: "Save a thought", exact: true }).click();
    await page.screenshot({ path: `/tmp/mind-palace-about-${width}.png`, fullPage: true, animations: "disabled" });
  });
}
