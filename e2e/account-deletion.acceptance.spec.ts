import { expect, test, type Page } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

async function setupAccount(page: Page, available = true) {
  let signedIn = true;
  let deletionStatus = 204;
  let deleteCalls = 0;
  let holdDeletion: Promise<void> | null = null;
  let pending: Record<string, unknown> | null = null;
  await page.route("**/api/auth/**", route => {
    if (route.request().url().endsWith("/sign-out")) signedIn = false;
    return route.fulfill({ json: signedIn ? {
      token: "synthetic-token",
      user: { id: "deletion-user", email: "deletion@example.test", name: "Alex" },
      session: { id: "synthetic-session", expiresAt: "2099-01-01T00:00:00Z" },
    } : { user: null, session: null } });
  });
  await page.route("**/api/backend/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/deletion/options")) return route.fulfill({ json: {
      recovery_window_days: 60, permanent_deletion_available: available,
    } });
    if (path.endsWith("/deletion/permanent")) {
      expect(request.method()).toBe("POST");
      expect(request.postDataJSON()).toEqual({ confirmation: "DELETE MY ACCOUNT" });
      deleteCalls++;
      if (holdDeletion) await holdDeletion;
      if (deletionStatus === 204) {
        signedIn = false;
        return route.fulfill({ status: 204 });
      }
      if (deletionStatus === 503) pending = {
        id: "pending-immediate", status: "pending", purge_at: "2026-01-01T00:00:00Z",
        requested_at: "2026-01-01T00:00:00Z", completed_at: null, error_message: null,
      };
      return route.fulfill({ status: deletionStatus, json: {
        detail: deletionStatus === 403
          ? "Sign out and sign in again before permanently deleting your account."
          : deletionStatus === 429 ? "Account deletion limit reached. Try again later."
          : "Synthetic upstream failure",
      } });
    }
    if (path.endsWith("/deletion")) {
      if (request.method() === "DELETE") { pending = null; return route.fulfill({ status: 204 }); }
      if (request.method() === "POST") pending = {
        id: "pending-scheduled", status: "pending", purge_at: "2099-01-01T00:00:00Z",
        requested_at: "2026-11-25T00:00:00Z", completed_at: null, error_message: null,
      };
      return route.fulfill({ status: request.method() === "POST" ? 202 : 200, json: pending });
    }
    if (path.endsWith("/settings")) return route.fulfill({ json: {
      default_use_with_ask_my_mind: false, onboarding_completed_at: "2026-11-21T00:00:00Z",
    } });
    if (path.endsWith("/settings/ai-usage")) return route.fulfill({ status: 503, json: {} });
    if (path.endsWith("/profile")) return route.fulfill({ json: {
      display_name: "Alex", email: "deletion@example.test", avatar_url: null,
    } });
    return route.fulfill({ json: [] });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Privacy & data", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Privacy & data" });
  await expect(panel.getByRole("button", { name: "Request account deletion", exact: true })).toBeEnabled();
  return {
    panel, calls: () => deleteCalls,
    setStatus: (status: number) => { deletionStatus = status; },
    hold: () => { let release!: () => void; holdDeletion = new Promise(resolve => { release = resolve; }); return release; },
  };
}

test("confirmation, cancel, busy state and deletion return to fresh signup", async ({ page }) => {
  const account = await setupAccount(page);
  await account.panel.getByRole("button", { name: "Delete permanently now", exact: true }).click();
  const form = page.getByRole("form", { name: "Permanent account deletion" });
  const submit = form.getByRole("button", { name: "Permanently delete account", exact: true });
  await expect(submit).toBeDisabled();
  await form.getByLabel("Type DELETE MY ACCOUNT to confirm").fill("DELETE");
  await expect(submit).toBeDisabled();
  await form.getByRole("button", { name: "Keep my account" }).click();
  expect(account.calls()).toBe(0);
  await account.panel.getByRole("button", { name: "Delete permanently now", exact: true }).click();
  await expect(form.getByLabel("Type DELETE MY ACCOUNT to confirm")).toHaveValue("");
  await form.getByLabel("Type DELETE MY ACCOUNT to confirm").fill("DELETE MY ACCOUNT");
  const release = account.hold();
  await submit.click();
  await expect(form.getByRole("button", { name: "Deleting account...", exact: true })).toBeDisabled();
  await expect(account.panel.getByRole("button", { name: "Close", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(form).toBeVisible();
  expect(account.calls()).toBe(1);
  release();
  await expect(page.getByText("Your account has been permanently deleted. You can sign up again with the same email.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create account", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has("account")).toBe(false);
  await page.reload();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
});

test("unconfigured deletion is unavailable without hiding recovery deletion", async ({ page }) => {
  const account = await setupAccount(page, false);
  await expect(account.panel.getByRole("button", { name: "Delete permanently now", exact: true })).toBeDisabled();
  await expect(account.panel).toContainText("Immediate deletion is unavailable");
  expect(account.calls()).toBe(0);
});

test("recent sign-in failures provide a sign-out action", async ({ page }) => {
  const account = await setupAccount(page);
  account.setStatus(403);
  await account.panel.getByRole("button", { name: "Delete permanently now", exact: true }).click();
  await page.getByLabel("Type DELETE MY ACCOUNT to confirm").fill("DELETE MY ACCOUNT");
  await page.getByRole("button", { name: "Permanently delete account", exact: true }).click();
  await expect(account.panel.getByRole("alert")).toContainText("Sign out and sign in again");
  await account.panel.getByRole("button", { name: "Sign out to sign in again" }).click();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
});

for (const status of [429, 503]) {
  test(`failed deletion (${status}) preserves confirmation and supports retry`, async ({ page }) => {
    const account = await setupAccount(page);
    account.setStatus(status);
    await account.panel.getByRole("button", { name: "Delete permanently now", exact: true }).click();
    await page.getByLabel("Type DELETE MY ACCOUNT to confirm").fill("DELETE MY ACCOUNT");
    await page.getByRole("button", { name: "Permanently delete account", exact: true }).click();
    await expect(account.panel.getByRole("alert")).toBeVisible();
    await expect(page.getByLabel("Type DELETE MY ACCOUNT to confirm")).toHaveValue("DELETE MY ACCOUNT");
    if (status === 503) {
      await expect(account.panel).toContainText("Permanent deletion is pending");
      await expect(account.panel.getByRole("button", { name: "Cancel deletion", exact: true })).toHaveCount(0);
    }
    account.setStatus(204);
    await page.getByRole("button", { name: "Permanently delete account", exact: true }).click();
    await expect(page.getByText("Your account has been permanently deleted. You can sign up again with the same email.")).toBeVisible();
    expect(account.calls()).toBe(2);
  });
}

test("scheduled deletion can still be requested and cancelled", async ({ page }) => {
  const account = await setupAccount(page);
  page.on("dialog", dialog => dialog.accept());
  await account.panel.getByRole("button", { name: "Request account deletion", exact: true }).click();
  await expect(account.panel).toContainText("Permanent deletion is scheduled for");
  await account.panel.getByRole("button", { name: "Cancel deletion", exact: true }).click();
  await expect(account.panel.getByRole("button", { name: "Request account deletion", exact: true })).toBeVisible();
  expect(account.calls()).toBe(0);
});

for (const width of [320, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`deletion confirmation fits ${width}px in ${theme}`, async ({ page }, testInfo) => {
      await page.addInitScript(value => localStorage.setItem("mind-palace-theme", value), theme);
      await page.setViewportSize({ width, height: 900 });
      const account = await setupAccount(page);
      await account.panel.getByRole("button", { name: "Delete permanently now", exact: true }).click();
      await page.getByLabel("Type DELETE MY ACCOUNT to confirm").fill("DELETE MY ACCOUNT");
      const contrast = await page.getByLabel("Type DELETE MY ACCOUNT to confirm").evaluate(element => {
        const style = getComputedStyle(element);
        const luminance = (color: string) => {
          const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(channel => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          });
          return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
        };
        const values = [luminance(style.color), luminance(style.backgroundColor)];
        return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
      });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
      await page.getByRole("button", { name: "Permanently delete account", exact: true }).scrollIntoViewIfNeeded();
      expect(await account.panel.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`deletion-${width}-${theme}.png`), fullPage: true });
      expect(account.calls()).toBe(0);
    });
  }
}
