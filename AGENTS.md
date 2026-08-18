<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Mind Palace Web

This is the separate Next.js frontend repo for Mind Palace.

Local commands:

```bash
npm run dev
npm run lint
npm run build
```

Project rules:

- Keep the first screen as the usable app experience, not a marketing page.
- Hide Ask My Mind until at least one AI-enabled thought exists.
- Keep `use_with_ask_my_mind` defaulted off unless user settings say otherwise.
- Do not implement local-only storage until the mobile phase.
- Do not log thought bodies, chat messages, prompts, API tokens, or AI responses.
- Keep backend calls in `src/lib/api.ts` or a nearby API boundary.
