# Authenticated MVP acceptance

The Playwright suite in `e2e/mvp.acceptance.spec.ts` checks the real browser
journey against a disposable authenticated account. It is intentionally
separate from unit tests and backend `TestClient` tests: the browser suite
exercises the Next.js UI, Neon Auth session cookie, FastAPI API, and the user
visible state transitions together.

## Environment

Run the frontend, backend, Redis, and RQ worker with a development database.
Apply the backend migrations before starting the API. Use a disposable Neon
Auth account and keep its storage state out of Git; `.gitignore` already
excludes `playwright/.auth/`.

Install the browser once if needed:

```bash
npx playwright install chromium
```

Create a Playwright storage state after signing in to the local app, then run:

```bash
MIND_PALACE_E2E_STORAGE_STATE=playwright/.auth/mind-palace.json \
  npm run e2e:auth

MIND_PALACE_E2E_STORAGE_STATE=playwright/.auth/mind-palace.json \
  npm run e2e
```

The `e2e:auth` command opens a visible browser so the test account can be
signed in without putting credentials or confirmation codes in a script. This
is a separate Playwright browser profile; an existing sign-in in regular
Chrome is not shared with it. Complete sign-in in the opened Playwright
window, wait until the private home is visible, then return to the terminal
and press Enter to save the state.

For a disposable account, the capture step can sign in automatically from
environment variables. Keep these values out of the repository and shell
scripts:

```bash
MIND_PALACE_E2E_EMAIL='test@example.com' \
MIND_PALACE_E2E_PASSWORD='your-password' \
MIND_PALACE_E2E_STORAGE_STATE=playwright/.auth/mind-palace.json \
  npm run e2e:auth
```

The helper still verifies that the private home is visible before writing the
storage state.

The config starts the frontend automatically. To use an already-running
frontend instead, add `MIND_PALACE_E2E_NO_WEBSERVER=true` and set
`MIND_PALACE_E2E_BASE_URL` if the app is not on `http://localhost:3000`.

The AI-backed scenario is opt-in because it requires a configured OpenAI key
and a live worker:

```bash
MIND_PALACE_E2E_STORAGE_STATE=playwright/.auth/mind-palace.json \
MIND_PALACE_E2E_AI=true \
  npm run e2e
```

## Coverage

The deterministic authenticated suite covers the private home, thought capture
with AI disabled, Recall search, active-filter clearing, and sign-out. The
AI-gated scenario covers AI-enabled capture, Ask My Mind visibility, and a
grounded source response.

If `MIND_PALACE_E2E_STORAGE_STATE` is absent, the suite skips instead of
pretending the user is authenticated. A skipped run is setup evidence, not MVP
acceptance evidence.
