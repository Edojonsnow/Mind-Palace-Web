import { expect, test } from "@playwright/test";
import { createActionKeys } from "../src/lib/action-keys";

test("action keys distinguish retries, changed payloads, success, and accounts", () => {
  const actions = createActionKeys("first");
  const first = actions.get("capture", { body: "Thought" });
  expect(actions.get("capture", { body: "Thought" })).toBe(first);
  expect(actions.get("capture", { body: "Changed" })).not.toBe(first);
  actions.complete("capture");
  expect(actions.get("capture", { body: "Thought" })).not.toBe(first);
  expect(createActionKeys("second").get("capture", { body: "Thought" })).not.toBe(first);
  actions.clear();
  expect(actions.get("capture", { body: "Thought" })).not.toBe(first);
});

test.describe("request retries", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/**", route => route.fulfill({ json: {
      user: { id: "retry-test", email: "retry@example.test", name: "Alex" },
      session: { id: "retry-session", token: "synthetic-token", userId: "retry-test", expiresAt: "2099-01-01T00:00:00Z" },
    } }));
    await page.route("**/api/backend/**", route => {
      const path = new URL(route.request().url()).pathname;
      return route.fulfill({ json: path.endsWith("/settings") ? { default_use_with_ask_my_mind: false } : [], headers: { "x-total-count": "1", "x-total-pages": "1" } });
    });
  });

  test("capture reuses a failed action key but a new capture gets a new key", async ({ page }) => {
    const keys: string[] = [];
    await page.route("**/api/backend/thoughts", route => {
      if (route.request().method() !== "POST") return route.fallback();
      keys.push(route.request().headers()["idempotency-key"]);
      return keys.length === 1 ? route.abort("failed") : route.fulfill({ status: 201, json: {} });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Save a thought", exact: true }).filter({ visible: true }).first().click();
    await page.getByLabel("Your thought", { exact: true }).fill("Keep this once");
    await page.getByRole("button", { name: "Keep this thought" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("button", { name: "Keep this thought" })).toBeEnabled();
    await page.getByRole("button", { name: "Keep this thought" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
    await page.getByRole("button", { name: "Save a thought", exact: true }).filter({ visible: true }).first().click();
    await page.getByLabel("Your thought", { exact: true }).fill("Keep this once");
    await page.getByRole("button", { name: "Keep this thought" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(keys[2]).not.toBe(keys[0]);
  });

  test("Ask restores a failed question and retries with the same key", async ({ page }) => {
    const keys: string[] = [];
    await page.route("**/api/backend/ask", route => {
      keys.push(route.request().headers()["idempotency-key"]);
      return keys.length === 1 ? route.abort("failed") : route.fulfill({ json: {
        conversation_id: "00000000-0000-0000-0000-000000000001", answer: "One answer",
        sources: [], created_at: "2026-10-01T12:00:00Z",
      } });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Ask my mind", exact: true }).click();
    const question = page.locator("#ask-question");
    await question.fill("A question to retry");
    await page.getByRole("button", { name: /^Ask\s/ }).click();
    await expect(question).toHaveValue("A question to retry");
    await expect(page.getByRole("log", { name: "Conversation" }).getByText("A question to retry")).toHaveCount(0);
    await page.getByRole("button", { name: /^Ask\s/ }).click();
    await expect(page.getByText("One answer", { exact: true })).toBeVisible();
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
    await expect(page.getByRole("log", { name: "Conversation" }).getByText("A question to retry")).toHaveCount(1);
  });
});
