import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Visual-only previews. All notes below are synthetic, never account data.
const out = 'docs/design-review/unified-library';
await mkdir(out, { recursive: true });
await writeFile(`${out}/README.md`, '# Personal library visual previews\n\nAll notes and counts in these captures are synthetic design fixtures. Synthetic API fixtures support visual interaction checks only; this is not the authenticated E2E suite or proof of live backend correctness.\n');
const browser = await chromium.launch();
const now = '2026-09-27T17:15:00Z';
const baseThought = { user_id: 'preview-user', manual_tags: [], use_with_ask_my_mind: false, ai_processing_status: 'not_requested', created_at: now, updated_at: now, is_archived: false, deleted_at: null, book_title: null, book_author: null, source_title: null, source_author: null };
const thoughts = [
  { ...baseThought, id: 'one', thought_type: 'journal', title: 'A quieter kind of progress', body: 'I returned to my notebook after a long walk. Small, steady steps make room for the work that matters.\n\nI want to remember that progress does not always arrive with an announcement.', manual_tags: ['reflection', 'work'], use_with_ask_my_mind: true, ai_processing_status: 'completed' },
  { ...baseThought, id: 'two', thought_type: 'quote', title: null, body: 'Pay attention to what you keep coming back to. There is usually something there.', manual_tags: ['attention'] },
  { ...baseThought, id: 'three', thought_type: 'thought', title: 'A room for unfinished ideas', body: 'Maybe the best ideas are the ones we let sit for a while. I want a place to leave a question without rushing to answer it.', manual_tags: ['ideas'] },
  { ...baseThought, id: 'four', thought_type: 'book_excerpt', title: 'On choosing your own life', body: 'A reading note about the moments when Circe begins to make her own choices, rather than wait for permission. Revisit this chapter.', book_title: 'Circe', book_author: 'Madeline Miller', manual_tags: ['reading'] },
  { ...baseThought, id: 'five', thought_type: 'thought', title: 'A small ritual', body: 'Tea. An open window. Ten minutes before the rest of the day begins.', manual_tags: ['mornings'] },
  { ...baseThought, id: 'six', thought_type: 'journal', title: 'The long way home', body: 'Took the longer route home today. The light was changing and the street was almost empty.\n\nThere is a certain kind of clarity that only comes when I stop trying to be productive.', manual_tags: ['places', 'reflection'] },
  { ...baseThought, id: 'seven', thought_type: 'quote', title: null, body: 'Make a little room for the things that do not need a reason.', manual_tags: ['creativity'] },
  { ...baseThought, id: 'eight', thought_type: 'thought', title: 'For the next conversation', body: 'Ask about the book she mentioned. Something about memory and the stories we tell ourselves.', manual_tags: ['people'] },
  { ...baseThought, id: 'nine', thought_type: 'book_excerpt', title: 'A note in the margin', body: 'The part I want to return to is the relationship between the places we live and the person we become.', book_title: 'The Art of Noticing', book_author: 'Rob Walker', manual_tags: ['reading', 'attention'] },
];
const pagedThoughts = Array.from({ length: 22 }, (_, i) => ({ ...thoughts[i % thoughts.length], id: `paged-${i}`, manual_tags: ['paged'] }));
try {
  for (const theme of ['dark', 'light']) {
    for (const width of [320, 375, 414, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme });
      await context.addInitScript(t => localStorage.setItem('mind-palace-theme', t), theme);
      const page = await context.newPage();
      await page.route('**/api/auth/**', route => route.fulfill({ json: { user: { id: 'preview-user', name: 'Alex', email: 'preview@example.test' }, session: { id: 'preview-session', token: 'synthetic-preview-token', userId: 'preview-user', expiresAt: '2099-01-01T00:00:00Z' } } }));
      await page.route('**/api/backend/**', async route => {
        const url = new URL(route.request().url());
        const path = url.pathname.replace('/api/backend', '');
        let json = {};
        if (path.startsWith('/thoughts/') && route.request().method() === 'PUT') {
          const thought = [...thoughts, ...pagedThoughts].find(item => item.id === path.split('/').at(-1));
          Object.assign(thought, route.request().postDataJSON());
          return route.fulfill({ json: thought });
        }
        if (path === '/thoughts') {
          let items = url.searchParams.get('tag') === 'paged' ? pagedThoughts : thoughts;
          const q = url.searchParams.get('q')?.toLowerCase();
          const tag = url.searchParams.get('tag');
          const type = url.searchParams.get('thought_type');
          const book = url.searchParams.get('book')?.toLowerCase();
          const bookId = url.searchParams.get('book_id');
          if (q) items = items.filter(item => [item.title, item.body, item.book_title, item.book_author, ...item.manual_tags].filter(Boolean).join(' ').toLowerCase().includes(q));
          if (tag) items = items.filter(item => item.manual_tags.includes(tag));
          if (type) items = items.filter(item => item.thought_type === type);
          if (book) items = items.filter(item => [item.book_title, item.book_author].filter(Boolean).join(' ').toLowerCase().includes(book));
          if (bookId) items = items.filter(item => item.book_title === 'Circe');
          const archive = url.searchParams.get('is_archived');
          if (archive) items = items.filter(item => item.is_archived === (archive === 'true'));
          const pageNumber = Number(url.searchParams.get('page') || 1);
          const size = Number(url.searchParams.get('page_size') || 20);
          return route.fulfill({ json: items.slice((pageNumber - 1) * size, pageNumber * size),
            headers: { 'x-total-count': String(items.length), 'x-total-pages': String(Math.ceil(items.length / size)), 'x-page': String(pageNumber), 'x-page-size': String(size) } });
        }
        if (path === '/settings') json = { default_use_with_ask_my_mind: false };
        if (path === '/books') json = [{ id: 'preview-book', title: 'Circe', author: 'Madeline Miller', thought_count: 2 }];
        if (path === '/remember') json = { thoughts_analyzed: thoughts.length, categories: [{ key: 'tags', label: 'Tags', items: [{ label: 'reflection', count: 2 }, { label: 'work', count: 1 }] }, { key: 'books', label: 'Books', items: [{ label: 'Circe', count: 2 }] }] };
        if (path.includes('deletion')) json = null;
        if (path === '/ask') json = { answer: 'Your saved reflections return to making space for slower, more deliberate work.', sources: [{ thought_id: 'one', chunk_id: 'preview-chunk', citation_label: 'S1', title: thoughts[0].title, snippet: thoughts[0].body }], conversation_id: 'preview-chat', created_at: now };
        return route.fulfill({ json, headers: { 'x-total-count': String(thoughts.length), 'x-total-pages': '1', 'x-page': '1', 'x-page-size': '20' } });
      });
      const capture = async name => page.screenshot({ path: `${out}/${theme}-${width}-${name}.png`, fullPage: true, animations: 'disabled' });
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Open thought: A quieter kind of progress' }).waitFor();
      await capture('home');
      await page.screenshot({ path: `${out}/${theme}-${width}-home-viewport.png`, animations: 'disabled' });
      if ([375, 1440].includes(width)) {
        await page.locator('summary').filter({ hasText: 'Explore your mind' }).click();
        await page.locator('[data-status="ready"]').waitFor({ timeout: 20000 });
        await capture('brain');
        const canvas = page.locator('canvas');
        const box = await canvas.boundingBox();
        await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * .7, box.y + box.height * .55, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(300);
        await capture('brain-rotated');
        await page.locator('summary').filter({ hasText: 'Explore your mind' }).click();
        await page.getByRole('button', { name: 'Open thought: A quieter kind of progress' }).click();
        await capture('thought');
        await page.getByRole('button', { name: 'Close thought preview' }).last().click();
        await page.getByRole('button', { name: 'Save a thought', exact: true }).filter({ visible: true }).first().click();
        await capture('capture');
        await page.getByRole('button', { name: 'Close', exact: true }).click();
        await page.getByRole('button', { name: 'Ask my mind', exact: true }).click();
        await page.getByPlaceholder('Ask something only your mind could answer…').fill('What keeps coming up in my writing?');
        await page.getByRole('button', { name: /Ask →/ }).click();
        await page.getByText('Your saved reflections return', { exact: false }).waitFor();
        await capture('ask');
        await page.getByRole('button', { name: /Return to my mind/ }).click();
        await page.locator('#library-search').fill('progress');
        await page.getByRole('button', { name: 'Search memory', exact: true }).click();
        await page.getByRole('heading', { name: 'Search results' }).waitFor();
        await page.getByRole('button', { name: 'Open thought: A quieter kind of progress' }).waitFor();
        await capture('search');
        await page.locator('summary').filter({ hasText: 'Filters' }).click();
        await page.getByLabel('Thought type', { exact: true }).selectOption('journal');
        await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
        await page.getByText('Type: journal', { exact: true }).waitFor();
        await capture('filters');
        await page.getByRole('button', { name: 'Clear all', exact: true }).click();
        await page.getByRole('button', { name: 'Open thought: A quieter kind of progress' }).waitFor();
        await page.getByRole('button', { name: 'Edit thought', exact: true }).first().click();
        await page.getByRole('region', { name: 'Edit thought', exact: true }).waitFor();
        await capture('editor');
        await page.getByRole('button', { name: 'Cancel', exact: true }).click();
        await page.locator('#library-search').fill('no-match-fixture');
        await page.getByRole('button', { name: 'Search memory', exact: true }).click();
        await page.getByRole('heading', { name: 'Nothing matches yet.', exact: true }).waitFor();
        await capture('empty-search');
        await page.getByRole('button', { name: 'Clear search and filters', exact: true }).click();
        await page.getByRole('button', { name: 'Open thought: A quieter kind of progress' }).waitFor();
        await page.getByLabel('Tag', { exact: true }).fill('paged');
        await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
        await page.getByText('Page 1 of 2', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Next page', exact: true }).click();
        await page.getByText('Page 2 of 2', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Open thought: A room for unfinished ideas' }).waitFor();
        await capture('pagination');
        console.log(`Visual interactions completed: ${theme}, ${width}px`);
      }
      await context.close();
    }
  }
} finally { await browser.close(); }
console.log(`Visual previews saved in ${out}`);
