import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

// Public product imagery contains only these synthetic fixtures, never account data.
const output = "public/product";
const baseURL = process.env.MIND_PALACE_PREVIEW_URL ?? "http://localhost:3000";
const date = "2026-11-10T09:00:00Z";
const baseThought = {
  user_id: "product-demo", manual_tags: [], collection_ids: [],
  use_with_ask_my_mind: false, ai_processing_status: "not_requested",
  created_at: date, updated_at: date, is_archived: false, deleted_at: null,
  book_id: null, book_title: null, book_author: null, source_title: null, source_author: null,
};
const thoughts = [
  { ...baseThought, id: "demo-1", thought_type: "journal", title: "A little room to think", body: "The morning walk made a difference. No headphones, no catching up. Just a little space before the day started.\n\nI want to do this more often.", manual_tags: ["mornings", "reflection"], use_with_ask_my_mind: true, ai_processing_status: "ready" },
  { ...baseThought, id: "demo-2", thought_type: "thought", title: "For the next conversation", body: "Ask Maya about the book she mentioned. Something about memory, and the stories we keep telling ourselves.", manual_tags: ["conversations"] },
  { ...baseThought, id: "demo-3", thought_type: "book_excerpt", title: "A note in the margin", body: "Reading note: I keep returning to the moments when Circe starts making her own choices. There is something here about learning to trust your own voice.", book_id: "demo-book", book_title: "Circe", book_author: "Madeline Miller", manual_tags: ["reading"] },
  { ...baseThought, id: "demo-4", thought_type: "quote", title: "Something to come back to", body: "Make room for the ideas that are not ready to be useful yet.", manual_tags: ["ideas"] },
  { ...baseThought, id: "demo-5", thought_type: "thought", title: "An idea for the weekend", body: "A small reading group. One book, a few friends, and a conversation that goes wherever it needs to.", manual_tags: ["reading", "friends"] },
  { ...baseThought, id: "demo-6", thought_type: "journal", title: "The long way home", body: "Took a different route home. I noticed the light through the trees, a shop I had never seen, and how much I miss when I am in a hurry.", manual_tags: ["reflection"] },
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1360, height: 860 }, colorScheme: "light" });
  await context.addInitScript(() => localStorage.setItem("mind-palace-theme", "light"));
  const page = await context.newPage();
  await page.route("**/api/auth/**", route => route.fulfill({ json: {
    token: "synthetic-token",
    user: { id: "product-demo", name: "Alex", email: "demo@example.test" },
    session: { id: "demo-session", token: "synthetic-token", expiresAt: "2099-01-01T00:00:00Z" },
  } }));
  await page.route("**/api/backend/**", route => {
    const path = new URL(route.request().url()).pathname.replace("/api/backend", "");
    let json = [];
    if (path === "/thoughts") json = thoughts;
    if (path === "/settings") json = { default_use_with_ask_my_mind: false };
    if (path === "/profile") json = { display_name: "Alex" };
    if (path === "/settings/ai-usage") json = null;
    if (path === "/books") json = [{ id: "demo-book", title: "Circe", author: "Madeline Miller", thought_count: 1, created_at: date }];
    if (path === "/collections") json = [{ id: "demo-collection", name: "Things to return to", thought_count: 3 }];
    if (path === "/account/deletion") json = null;
    if (path === "/ask") json = {
      conversation_id: "demo-chat", created_at: date,
      answer: "Your morning walks seem to give you space before the day gets busy. You wrote about walking without headphones and wanting to do it more often. [S1]",
      sources: [{ thought_id: "demo-1", chunk_id: "demo-chunk", citation_label: "S1", title: thoughts[0].title, snippet: thoughts[0].body }],
    };
    return route.fulfill({ json, headers: { "X-Total-Count": String(thoughts.length), "X-Total-Pages": "1" } });
  });
  const capture = async name => {
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${output}/${name}.jpg`, type: "jpeg", quality: 88, animations: "disabled" });
  };
  await page.goto(baseURL);
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.getByRole("button", { name: "Open thought: A little room to think", exact: true }).waitFor();
  await capture("library");
  await page.setViewportSize({ width: 390, height: 860 });
  await capture("library-mobile");
  await page.setViewportSize({ width: 1360, height: 860 });
  await page.getByRole("button", { name: "Save a thought", exact: true }).filter({ visible: true }).first().click();
  await page.getByLabel("Your thought", { exact: true }).fill("I had an idea on the walk home. A place for the notes, questions, and little things I do not want to lose.");
  await capture("capture");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Ask my mind", exact: true }).click();
  await page.getByPlaceholder("Ask something only your mind could answer…").fill("What has been helping me make time to think?");
  await page.getByRole("button", { name: /^Ask\s/ }).click();
  await page.getByText("Your morning walks seem", { exact: false }).waitFor();
  await capture("ask");
  await page.getByRole("button", { name: "Return to my mind" }).click();
  await page.getByRole("button", { name: "Books", exact: true }).click();
  await page.getByText("Circe", { exact: true }).waitFor();
  await capture("books");
} finally {
  await browser.close();
}
console.log("Generated five product images using synthetic content only.");
