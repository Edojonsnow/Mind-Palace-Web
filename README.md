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

## Current Auth Boundary

The first web slice stores a bearer token locally and sends it to the backend API. This is temporary and should be replaced with the real Neon Auth sign-in flow before production use.

## Checks

```bash
npm run lint
npm run build
```

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
