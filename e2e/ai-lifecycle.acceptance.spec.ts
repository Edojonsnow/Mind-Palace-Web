import { expect, test, type Page } from "@playwright/test";

const hasAuthState = Boolean(process.env.MIND_PALACE_E2E_STORAGE_STATE);
const runAiScenarios = process.env.MIND_PALACE_E2E_AI === "true";

type ThoughtSnapshot = {
  id: string;
  ai_processing_status: "not_requested" | "pending" | "processing" | "ready" | "failed";
};

type UsageSnapshot = {
  organization_count: number;
  units_used: number;
};

async function createAiThought(page: Page, body: string) {
  const response = await page.request.post("/api/backend/thoughts", {
    data: { body, use_with_ask_my_mind: true },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as ThoughtSnapshot;
}

async function getThought(page: Page, thoughtId: string) {
  const response = await page.request.get(`/api/backend/thoughts/${thoughtId}`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as ThoughtSnapshot;
}

async function waitForReady(page: Page, thoughtId: string) {
  await expect
    .poll(
      async () => (await getThought(page, thoughtId)).ai_processing_status,
      {
        timeout: 120_000,
        intervals: [2_000, 5_000, 10_000],
        message: "AI organization did not reach ready state",
      },
    )
    .toBe("ready");
}

async function updateThought(
  page: Page,
  thoughtId: string,
  data: Record<string, unknown>,
) {
  const response = await page.request.patch(`/api/backend/thoughts/${thoughtId}`, { data });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as ThoughtSnapshot;
}

async function getUsage(page: Page) {
  const response = await page.request.get("/api/backend/settings/ai-usage");
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as UsageSnapshot;
}

async function semanticMatches(page: Page, query: string) {
  const response = await page.request.get(
    `/api/backend/thoughts?q=${encodeURIComponent(query)}&search_mode=semantic&page_size=100`,
  );
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["x-search-mode"]).toBe("semantic");
  return (await response.json()) as Array<{ id: string }>;
}

test.describe("authenticated AI organization lifecycle", () => {
  test.skip(
    !hasAuthState || !runAiScenarios,
    "Set MIND_PALACE_E2E_STORAGE_STATE and MIND_PALACE_E2E_AI=true to run AI-backed acceptance scenarios.",
  );

  test("re-embeds edits, removes disabled artifacts, and charges re-enable once", async ({ page }) => {
    const marker = Date.now();
    const originalBody = `I protect a quiet morning routine by keeping my phone away from my desk. Lifecycle ${marker}`;
    const editedBody = `I review creative project priorities every Sunday evening before planning the week. Lifecycle ${marker}`;
    let thoughtId: string | undefined;

    try {
      const beforeUsage = await getUsage(page);
      const created = await createAiThought(page, originalBody);
      thoughtId = created.id;
      expect(["pending", "processing", "ready"]).toContain(created.ai_processing_status);
      await waitForReady(page, thoughtId);

      const morningMatches = await semanticMatches(page, "What habit helps avoid distractions at the start of the day?");
      expect(morningMatches.some((thought) => thought.id === thoughtId)).toBeTruthy();

      const edited = await updateThought(page, thoughtId, { body: editedBody });
      expect(["pending", "processing", "ready"]).toContain(edited.ai_processing_status);
      await waitForReady(page, thoughtId);

      const planningMatches = await semanticMatches(page, "How do I prepare for the week ahead?");
      expect(planningMatches.some((thought) => thought.id === thoughtId)).toBeTruthy();

      const disabled = await updateThought(page, thoughtId, { use_with_ask_my_mind: false });
      expect(disabled.ai_processing_status).toBe("not_requested");
      const disabledMatches = await semanticMatches(page, "How do I prepare for the week ahead?");
      expect(disabledMatches.some((thought) => thought.id === thoughtId)).toBeFalsy();

      const reenabled = await updateThought(page, thoughtId, { use_with_ask_my_mind: true });
      expect(["pending", "processing", "ready"]).toContain(reenabled.ai_processing_status);
      await waitForReady(page, thoughtId);
      const afterUsage = await getUsage(page);
      expect(afterUsage.organization_count).toBeGreaterThan(beforeUsage.organization_count);
      expect(afterUsage.units_used).toBeGreaterThan(beforeUsage.units_used);
    } finally {
      if (thoughtId) {
        await page.request.delete(`/api/backend/thoughts/${thoughtId}`);
      }
    }
  });
});
