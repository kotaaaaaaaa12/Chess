# Chess Master — Frontend

Next.js chess UI: AI, online play, replays, profile.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

## Env (`frontend/.env.local`)

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

`/api/*` is proxied to `API_URL` via `next.config.ts`.

## Run with backend

From `../server`:

```bash
npm run dev:all
```

## Deploy (Vercel etc.)

```bash
npm install && npm run build && npm start
```

Set `API_URL` and `NEXT_PUBLIC_WS_URL` to your production backend.
