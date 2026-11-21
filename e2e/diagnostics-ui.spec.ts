import { expect, test } from "@playwright/test";

test("library failures keep the support reference visible until a successful retry", async ({ page }) => {
  const reference = "00000000-0000-4000-8000-000000000001";
  let shouldFail = true;
  await page.route("**/api/auth/**", route => route.fulfill({ json: {
    token: "synthetic-token",
    user: { id: "diagnostics-test", email: "diagnostics@example.test", name: "Alex" },
    session: { id: "session", token: "synthetic-token", expiresAt: "2099-01-01T00:00:00Z" },
  } }));
  await page.route("**/api/backend/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/thoughts") && shouldFail) {
      return route.fulfill({ status: 502, headers: { "X-Request-ID": reference }, json: { detail: "Unavailable" } });
    }
    return route.fulfill({ json: path.endsWith("/settings") ? { default_use_with_ask_my_mind: false } : [] });
  });
  await page.goto("/");
  const alert = page.getByRole("alert").filter({ hasText: "Your thoughts could not be loaded." });
  await expect(alert).toContainText(reference);
  await expect(page.getByRole("status").filter({ hasText: reference })).toHaveCount(0, { timeout: 6000 });
  await expect(alert).toContainText(reference);
  shouldFail = false;
  await alert.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(alert).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "A thought is all it takes.", exact: true })).toBeVisible();
});
