import { expect, test } from "@playwright/test";

test.describe("presentation safeguards", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/**", route => route.fulfill({ json: {
      user: { id: "design-test", email: "design@example.test", name: "Alex" },
      session: { id: "design-session", token: "synthetic-token", userId: "design-test", expiresAt: "2099-01-01T00:00:00Z" },
    } }));
    await page.route("**/api/backend/**", route => {
      const path = new URL(route.request().url()).pathname;
      return route.fulfill({ json: path.endsWith("settings") ? { default_use_with_ask_my_mind: false } : [], headers: { "x-total-count": "0", "x-total-pages": "0" } });
    });
  });

  test("capture traps keyboard focus and returns it to its trigger", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Save a thought", exact: true }).filter({ visible: true }).first();
    await trigger.click();
    await page.getByLabel("Your thought", { exact: true }).fill("A thought to keep.");
    const last = page.getByRole("button", { name: "Keep this thought" });
    await last.focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Close", exact: true })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(last).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("reduced motion uses a static brain without delaying actions", async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("[data-status]")).toHaveCount(0);
    await page.locator("summary").filter({ hasText: "Explore your mind" }).click();
    await expect(page.locator('[data-status="unavailable"]')).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save a thought", exact: true }).filter({ visible: true }).first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("reduced-motion.png"), fullPage: true });
  });

  test("no WebGL keeps the static brain and working capture", async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(this: HTMLCanvasElement, type: string, ...args: unknown[]) {
        if (type.includes("webgl")) return null;
        return Reflect.apply(original, this, [type, ...args]);
      } as typeof original;
    });
    await page.goto("/");
    await page.locator("summary").filter({ hasText: "Explore your mind" }).click();
    await expect(page.locator('[data-status="unavailable"]')).toBeVisible();
    await page.getByRole("button", { name: "Save a thought", exact: true }).filter({ visible: true }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.screenshot({ path: testInfo.outputPath("no-webgl.png"), fullPage: true });
  });

  for (const width of [390, 1440]) test(`brain model renders and rotates at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await page.locator("summary").filter({ hasText: "Explore your mind" }).click();
    await expect(page.locator('[data-status="ready"]')).toBeVisible({ timeout: 30_000 });
    const brain = page.getByRole("group", { name: /Rotatable 3D brain/ });
    const before = await brain.screenshot();
    expect(before.byteLength).toBeGreaterThan(10000);
    await brain.focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(400);
    const after = await brain.screenshot({ path: testInfo.outputPath(`brain-${width}.png`) });
    expect(after.equals(before)).toBe(false);
    await page.getByRole("button", { name: "Reset brain rotation" }).click();
    await expect(page.getByRole("button", { name: "Save a thought", exact: true }).filter({ visible: true }).first()).toBeVisible();
  });
});
