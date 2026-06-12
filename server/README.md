# Chess Master — Server

Backend: REST API, WebSocket multiplayer, PostgreSQL, Google OAuth.

## Setup

```bash
npm install
cp .env.example .env.local   # fill DATABASE_URL, JWT_SECRET, Google OAuth
npm run db:migrate
npm run dev                    # API :4000 + WS :3001
```

## Run everything (frontend + server)

From this folder:

```bash
npm run dev:all
```

Starts frontend on http://localhost:3000 and this server on :4000 / :3001.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | API + WebSocket only |
| `npm run dev:all` | Frontend + backend together |
| `npm run start` | Production server |
| `npm run db:migrate` | Apply SQL migrations |
| `npm run db:studio` | Drizzle Studio |

## Local Postgres

```bash
docker compose up -d
```

## Deploy

Set `server/.env.local` (or host env vars):

- `DATABASE_URL`, `DATABASE_SSL`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `APP_URL` (frontend URL for OAuth)
- `API_PORT`, `WS_PORT`

```bash
npm install && npm start
```
