# Mind Palace Web

Web frontend for Mind Palace.

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS

## Local Setup

Install dependencies:

```bash
npm install
```

Create local env:

```bash
cp .env.example .env.local
```

Fill in the Neon Auth values in `.env.local`:

```bash
NEON_AUTH_BASE_URL=https://<your-neon-auth-host>/neondb/auth
NEON_AUTH_COOKIE_SECRET=<random-secret-at-least-32-characters>
```

Generate the cookie secret locally instead of looking for it in Neon:

```bash
openssl rand -base64 32
```

Use the Neon Auth API base URL for the same Neon branch as the backend. For a
Neon Auth host such as `https://<your-neon-auth-host>`, the web value is
`https://<your-neon-auth-host>/neondb/auth`. The cookie secret is only used by
this Next.js server to sign the local session cache; keep it private and
stable per environment. A new secret signs users out of that environment.

This is intentionally different from the FastAPI backend's
`NEON_AUTH_ISSUER`, which is the host origin without `/neondb/auth` because it
must match the `iss` claim in the JWT.

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Backend

Set:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

The backend must allow this frontend origin through `BACKEND_CORS_ORIGINS`.

## Authentication

Neon Auth handles sign-up, sign-in, session cookies, and token refresh through
`/api/auth`. The browser keeps the session in the auth cookie and requests a
short-lived access token when calling the FastAPI backend. No access token is
stored in local storage.

After sign-up, the app requests Neon Auth's email confirmation code and keeps
the user in a confirmation step until the six-digit code is verified. Enable
email verification and email delivery for the relevant Neon Auth branch in the
Neon Console. Neon provides shared email delivery for development; configure a
provider of your own before production use.

The backend must be configured with the matching Neon Auth issuer and JWKS
settings. Its CORS setting must include `http://localhost:3000` for local
development.

## Checks

```bash
npm run lint
npm run build
```

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
