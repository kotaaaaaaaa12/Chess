# ♔ Chess Master

**Chess Master** is a production-ready, full-stack browser chess application. Play against a custom Minimax AI or Stockfish 18, challenge friends in real-time online rooms, track your ELO, save games to the cloud, and replay them move-by-move — all without installing anything.

The repository is intentionally split into **two independent deployable packages**:

| Folder       | Role                          | Deploy to              |
|--------------|-------------------------------|------------------------|
| `frontend/`  | Next.js 15 UI + chess engine  | Vercel, Netlify        |
| `server/`    | Express API + WebSocket + DB  | Render, Railway, Fly   |

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?style=flat-square)
![Stockfish](https://img.shields.io/badge/Stockfish-18_WASM-769656?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## Table of Contents

1. [Overview](#overview)
2. [Features (Detailed)](#features-detailed)
3. [Screens & User Flows](#screens--user-flows)
4. [Game Modes](#game-modes)
5. [Chess Engine & AI](#chess-engine--ai)
6. [ELO System](#elo-system)
7. [Project Structure (Full Tree)](#project-structure-full-tree)
8. [Architecture](#architecture)
9. [Tech Stack](#tech-stack)
10. [Prerequisites](#prerequisites)
11. [Installation (Step-by-Step)](#installation-step-by-step)
12. [Environment Variables](#environment-variables)
13. [Database Setup](#database-setup)
14. [Running Locally](#running-locally)
15. [REST API Reference](#rest-api-reference)
16. [WebSocket Protocol](#websocket-protocol)
17. [Authentication Flows](#authentication-flows)
18. [Settings & Customization](#settings--customization)
19. [Local Storage vs Cloud](#local-storage-vs-cloud)
20. [Deployment Guide](#deployment-guide)
21. [Security Notes](#security-notes)
22. [Troubleshooting](#troubleshooting)
23. [FAQ](#faq)
24. [Known Limitations](#known-limitations)
25. [License](#license)

---

## Overview

Chess Master combines a **client-side chess rules engine** (move generation, check detection, castling, en passant, promotion) with:

- **Two AI backends** — lightweight Minimax (alpha-beta) and Stockfish 18 WASM for GM-strength play and live position evaluation
- **Real-time multiplayer** — private 6-character room codes over WebSocket with JWT-authenticated sockets
- **Cloud persistence** — PostgreSQL via Drizzle ORM for users, OAuth accounts, game history, and ELO stats
- **Modern UI** — Framer Motion animations, marble/green/brown board themes, Lichess-style piece icons in the move list, Chess.com-style clock rail

All game logic runs in the browser. The server handles **auth**, **game saves**, and **multiplayer sync** only.

---

## Features (Detailed)

### ♟️ Core Chess

| Feature | Details |
|---------|---------|
| **Legal moves** | Full rule set including castling (kingside/queenside), en passant, pawn promotion |
| **Check / checkmate / stalemate** | Detected client-side; clear end-game modals with reason text |
| **Draw rules** | Stalemate, insufficient material, 50-move rule, threefold repetition, agreement (online) |
| **Castling animation** | King + rook move together with dual-piece animation (`castleAnimation.ts`) |
| **Promotion** | Modal to choose queen, rook, bishop, or knight |
| **Move list** | SAN notation with Lichess piece SVG icons; White/Black column headers |
| **Move arrows** | Optional best-move arrow overlay |
| **Opening names** | Detected from move history via opening book |
| **FEN export** | Position encoded for Stockfish eval and PGN generation |
| **Game resume** | Incomplete local games saved to `localStorage` and resumable from setup screen |

### 🤖 AI Opponents

| Engine | Description |
|--------|-------------|
| **Minimax** | Custom alpha-beta pruning with piece-square tables, opening book, async yields so the UI clock keeps ticking during search |
| **Stockfish 18** | WASM build (`stockfish-18-lite-single`) for move generation in hard mode and live eval bar |
| **Difficulties** | Easy / Medium / Hard — different search depths (Minimax) or skill levels (Stockfish) |
| **Hints** | Shows best move suggestion (can be disabled in settings) |
| **Threats** | Highlights squares your pieces are attacking (toggle in settings) |

### 🌐 Online Multiplayer

| Feature | Details |
|---------|---------|
| **Private rooms** | 6-character alphanumeric codes (no ambiguous chars like `0`/`O`) |
| **Invite link** | `https://yourapp.com/?join=CODE` auto-opens join tab |
| **Share UI** | Copy Code + Copy Link only (clean, no WhatsApp clutter) |
| **Auth required** | Must be logged in; JWT passed as `?token=` on WebSocket connect |
| **Color assignment** | Room creator = White, joiner = Black |
| **Sync** | Moves sent at animation start for low perceived latency |
| **Resignation** | Proper `winReason: "resignation"` — not mislabeled as checkmate |
| **Draw offers** | Offer / accept / decline over WebSocket |
| **Disconnect** | Opponent disconnect/reconnect events broadcast to room |

### 👤 Accounts & Profile

| Feature | Details |
|---------|---------|
| **Register / Login** | Username + password (bcrypt hashed server-side) |
| **Google OAuth** | One-click sign-in; avatar from Google profile |
| **Profile edit** | Update username and display name (`PATCH /api/auth/profile`) |
| **JWT sessions** | 7-day default expiry; stored in `localStorage` + sent as Bearer token |
| **Navbar menu** | Avatar, profile modal (portal-rendered), logout |
| **Cloud stats sync** | ELO, wins, losses, draws pulled from DB on login |

### 📊 Stats & History

| Feature | Details |
|---------|---------|
| **ELO rating** | Starts at 1200; K-factor 32; rated games only vs AI when enabled |
| **Game history** | Saved to PostgreSQL with full move `history` JSON + PGN text |
| **Replay modal** | Step through moves with board animation |
| **Game review** | Post-game analysis screen with move navigation |
| **Stats screen** | Win/loss/draw counts, ELO chart, game list with filters |
| **Confetti** | Celebration animation on human wins |

### 🎨 UI / UX

| Feature | Details |
|---------|---------|
| **Landing page** | Hero board with all 32 pieces in starting position; feature cards; auth CTAs |
| **Board themes** | Marble (default), green, brown |
| **Piece sets** | Neo (default), classic SVG sets |
| **Animation speed** | Slow / normal / fast |
| **Eval bar** | Vertical bar beside board showing Stockfish centipawn eval |
| **Clock rail** | Desktop: timers on left of board (Chess.com style); mobile: in player bars |
| **Live clock** | Wall-clock extrapolation — ticks during AI thinking, not just on moves |
| **Tutorial** | First-time overlay explaining controls |
| **Sounds** | Move/capture/check sounds (toggle in settings) |
| **Favicon** | Custom chess king icon (`src/app/icon.svg`) |

---

## Screens & User Flows

```
Landing Page
    ├── [Play Now] ──► Setup Screen (choose mode, color, timer, difficulty)
    │                      ├── Local / AI ──► Game Board
    │                      └── Online ──► Online Lobby
    │                                         ├── Create Room ──► Waiting (share code)
    │                                         └── Join Room ──► Game Board
    ├── [Stats & History] ──► Stats Screen (ELO, game list, replay)
    ├── [Login / Sign Up] ──► Auth Screen
    └── [Profile] (logged in) ──► Profile Edit Modal

Game Board
    ├── Settings panel (theme, sounds, hints, threats)
    ├── Resign / Draw offer (online)
    ├── Game Over Modal ──► Game Review
    └── Save to cloud (if logged in + vs AI rated)
```

### Deep link: Join online game

```
https://localhost:3000/?join=6R7HVE
```

Opens the app → Online Lobby → Join tab pre-filled with code.

### Deep link: Google OAuth return

```
https://localhost:3000/?auth_token=<JWT>
```

Frontend reads token from URL, stores in `localStorage`, clears query param.

---

## Game Modes

| Mode | `playAgainst` | Opponent | ELO tracking | Timer | Auth |
|------|---------------|----------|--------------|-------|------|
| Local 2-player | `human` | Friend on same device | No | Optional | No |
| Minimax AI | `minimax` | Browser AI | Optional (rated) | Optional | No |
| Stockfish AI | `stockfish` | WASM engine | Optional (rated) | Optional | No |
| Online | `online` | Remote player | No (yet) | Yes | **Required** |

### Time controls

| Value (seconds) | Label |
|-----------------|-------|
| `0` | No timer |
| `180` | 3 min |
| `300` | 5 min (default) |
| `600` | 10 min |
| `900` | 15 min |

### AI difficulty → opponent ELO (for rating calculation)

| Difficulty | Minimax ELO | Stockfish ELO |
|------------|-------------|---------------|
| Easy | 800 | 1000 |
| Medium | 1100 | 1550 |
| Hard | 1450 | 2200 |

---

## Chess Engine & AI

### Board coordinate system

Positions are integers `11`–`88` (file `1-8` = a-h, rank `1-8`). Example: `e4` = `54`, `e1` white king starts at `15`.

### Client-side modules (`frontend/src/lib/chess/`)

| File | Purpose |
|------|---------|
| `game.ts` | Core `Game` class — move validation, events, checkmate |
| `useChessGame.ts` | React hook orchestrating UI, AI, online, clock, animations |
| `ai.ts` | Minimax + alpha-beta with opening book integration |
| `stockfishEngine.ts` | Stockfish WASM worker wrapper |
| `stockfishWorker.ts` | Web Worker for non-blocking analysis |
| `gameClock.ts` | Decoupled clock state (ms remaining per side) |
| `castleAnimation.ts` | Dual-piece castle animation helper |
| `gameEnd.ts` | Win/draw reason copy for modals |
| `fen.ts` | FEN string generation |
| `pgn.ts` | PGN export |
| `openings.ts` / `openingBook.ts` | Opening name detection |
| `hints.ts` | Hint move from AI evaluation |
| `threats.ts` | Attack map for threat highlighting |
| `elo.ts` | ELO math (K=32) |
| `replay.ts` | Replay state machine |
| `simulationGame.ts` | Lightweight clone for AI search |

### Minimax details

- **Alpha-beta pruning** reduces search tree
- **Piece-square tables** for pawns and knights
- **Opening book** — predefined moves for first ~10 plies
- **Async yields** (`await` every N nodes) — prevents UI freeze and allows clock to tick
- **Depth by difficulty** — configured in `constants.ts` (`AI_DEPTH`)

### Stockfish details

- Copied from `node_modules/stockfish` to `public/stockfish/` on `npm install`
- Used for: hard-mode AI moves, live eval bar (`usePositionEval` hook)
- Runs in Web Worker — does not block main thread

---

## ELO System

- **Starting ELO:** `1200`
- **K-factor:** `32`
- **Formula:** standard Elo expected score: `1 / (1 + 10^((opp - player) / 400))`
- **Rated games:** Only vs Minimax/Stockfish when "Track ELO" is enabled in settings
- **Casual games:** Win/loss/draw counted but ELO unchanged
- **Cloud sync:** On game save (`POST /api/games`), server updates `users.elo`, `wins`, `losses`, `draws`, `games_played`
- **Local fallback:** `localStorage` leaderboard when not logged in

---

## Project Structure (Full Tree)

```
Chess-main/
├── README.md                          ← You are here
│
├── frontend/                          # Next.js 15 application
│   ├── package.json
│   ├── next.config.ts                 # API proxy rewrites
│   ├── tsconfig.json
│   ├── .env.example
│   ├── .env.local                     # (gitignored) your local env
│   │
│   ├── public/
│   │   ├── img/                       # Piece SVGs (white/black × 6 ranks)
│   │   └── stockfish/                 # stockfish.js + .wasm (postinstall copy)
│   │
│   ├── scripts/
│   │   ├── dev.mjs                    # Loads .env.local then starts next dev
│   │   └── copy-stockfish.js          # Copies Stockfish WASM to public/
│   │
│   └── src/
│       ├── app/
│       │   ├── layout.tsx             # Fonts, providers, metadata
│       │   ├── page.tsx               # Single-page app entry
│       │   ├── globals.css            # All styles (~3000 lines)
│       │   ├── icon.svg               # Browser tab favicon
│       │   └── apple-icon.svg         # iOS home screen icon
│       │
│       ├── components/                # UI components
│       │   ├── ChessGame.tsx          # Main app router (screen state machine)
│       │   ├── ChessBoard.tsx         # 8×8 board + drag/drop
│       │   ├── LandingPage.tsx        # Marketing / welcome screen
│       │   ├── StartScreen.tsx        # Game setup (mode, timer, color)
│       │   ├── OnlineLobby.tsx        # Create/join room UI
│       │   ├── AuthScreen.tsx         # Login / register forms
│       │   ├── StatsScreen.tsx        # ELO + history list
│       │   ├── GameReplayModal.tsx    # Cloud game replay
│       │   ├── GameReviewModal.tsx    # Post-game move review
│       │   ├── GameOverModal.tsx      # Win/loss/draw popup
│       │   ├── GameClock.tsx          # Timer display component
│       │   ├── GameClockRail.tsx      # Left-side clock layout (desktop)
│       │   ├── EvalBar.tsx            # Stockfish evaluation bar
│       │   ├── MoveList.tsx           # SAN move list with piece icons
│       │   ├── UserNavMenu.tsx        # Profile dropdown in navbar
│       │   ├── ProfileEditModal.tsx   # Edit username/display name
│       │   └── …                      # Modals, toolbars, tutorial, etc.
│       │
│       ├── context/
│       │   ├── AuthContext.tsx        # JWT user state, login/logout
│       │   └── SettingsContext.tsx  # Board theme, sounds, ELO toggle
│       │
│       ├── hooks/
│       │   ├── useChessGame.ts        # (re-export from lib)
│       │   ├── useOnlineMultiplayer.ts# WebSocket room lifecycle
│       │   ├── useGameClock.ts        # Live clock polling hook
│       │   ├── usePositionEval.ts     # Stockfish eval for current FEN
│       │   └── usePlayerStats.ts      # Local + cloud stats merge
│       │
│       └── lib/
│           ├── chess/                 # Full chess engine (see above)
│           ├── games/client.ts        # REST client for /api/games
│           ├── multiplayer/
│           │   ├── client.ts          # WebSocket wrapper
│           │   └── share.ts           # Invite link builder
│           ├── auth/types.ts
│           ├── settings/types.ts
│           └── storage.ts             # localStorage helpers
│
└── server/                            # Node.js backend
    ├── package.json
    ├── tsconfig.json                  # Imports chess types from ../frontend
    ├── drizzle.config.ts
    ├── docker-compose.yml             # Local PostgreSQL 16
    ├── .env.example
    ├── .env.local                     # (gitignored)
    ├── LICENSE
    │
    ├── drizzle/                       # SQL migrations (run in order)
    │   ├── 0000_init.sql              # users, oauth_accounts
    │   ├── 0001_games.sql             # games table
    │   └── 0002_user_stats.sql        # elo, wins, losses, draws columns
    │
    ├── scripts/
    │   ├── dev-all.mjs                # Start server + frontend together
    │   ├── db-migrate.mjs             # Apply SQL migrations
    │   └── import-json-users.mjs      # Legacy user import
    │
    └── src/
        ├── index.ts                   # HTTP server + WebSocket server entry
        ├── http.ts                    # Express app, CORS, routes mount
        │
        ├── routes/
        │   ├── auth.ts                # /api/auth/*
        │   └── games.ts               # /api/games/*
        │
        ├── ws/
        │   ├── roomManager.ts         # Room create/join/move/resign logic
        │   ├── socketAuth.ts          # JWT validation on WS connect
        │   └── types.ts               # ClientMessage / ServerMessage types
        │
        └── lib/
            ├── db/
            │   ├── index.ts           # pg Pool connection
            │   └── schema.ts          # Drizzle table definitions
            ├── auth/
            │   ├── jwt.ts             # sign/verify with jose
            │   ├── google.ts          # OAuth URL + token exchange
            │   ├── users.ts           # CRUD for users
            │   └── password.ts        # bcrypt helpers
            ├── games/
            │   ├── repository.ts      # Save/list/get games
            │   └── types.ts
            └── stats/
                ├── repository.ts      # ELO + W/L/D updates
                └── types.ts
```

---

## Architecture

### Request flow (local dev)

```
Browser  :3000
    │
    ├─ GET /                    → Next.js serves React app
    ├─ GET /api/auth/me         → Next.js rewrite → server :4000/api/auth/me
    ├─ POST /api/games          → Next.js rewrite → server :4000/api/games
    └─ WS  ws://localhost:3001  → Direct to server WebSocket (no proxy)
```

### Why `/api` is proxied but WebSocket is not

Next.js `rewrites` in `frontend/next.config.ts` forward HTTP `/api/*` to `API_URL`. WebSockets cannot use the same rewrite easily in dev, so the frontend connects directly to `NEXT_PUBLIC_WS_URL`.

### Data flow: rated game save

```
Game ends (client)
    → POST /api/games { history, result, eloChange, ... }
        → server creates row in `games` table
        → server updates `users.elo`, wins/losses/draws
    ← { game, stats }
    → client updates AuthContext + local stats
```

### Data flow: online move

```
Player A drags piece
    → animation starts
    → WS send { type: "move", roomId, pieceName, position }
        → server validates via shared Game class
        → WS broadcast to Player B
    → Player B receives move → plays animation → updates board
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 15.3 |
| UI Library | React | 19.1 |
| Language | TypeScript | 5.8 |
| Styling | Tailwind CSS | 4.1 |
| Animation | Framer Motion | 12.x |
| Icons | Lucide React | 0.513 |
| AI (browser) | Stockfish WASM | 18 |
| HTTP Server | Express | 4.21 |
| WebSocket | ws | 8.21 |
| ORM | Drizzle ORM | 0.45 |
| Database | PostgreSQL | 16 |
| Auth | jose (JWT), bcryptjs, Google OAuth 2.0 | — |
| Runtime (server) | tsx | 4.22 |
| Fonts | Outfit + Playfair Display | Google Fonts |

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 20+ | LTS recommended |
| npm | 10+ | Comes with Node |
| PostgreSQL | 14+ | Neon cloud or Docker locally |
| Git | any | To clone the repo |
| Google Cloud account | — | Only if using Google login |

---

## Installation (Step-by-Step)

### Step 1 — Clone the repository

```bash
git clone <your-repo-url> Chess-main
cd Chess-main
```

### Step 2 — Install frontend dependencies

```bash
cd frontend
npm install
# postinstall automatically copies Stockfish WASM to public/stockfish/
cd ..
```

### Step 3 — Install server dependencies

```bash
cd server
npm install
cd ..
```

### Step 4 — Create environment files

```bash
cp frontend/.env.example frontend/.env.local
cp server/.env.example server/.env.local
```

### Step 5 — Configure database (see [Database Setup](#database-setup))

Edit `server/.env.local` with your `DATABASE_URL`.

### Step 6 — Run migrations

```bash
cd server
npm run db:migrate
```

### Step 7 — (Optional) Configure Google OAuth

Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `server/.env.local`.  
See [Authentication Flows](#authentication-flows).

### Step 8 — Start development

```bash
cd server
npm run dev:all
```

Open **http://localhost:3000**

---

## Environment Variables

### Frontend — `frontend/.env.local`

```env
# Public URL of the frontend (used in OAuth redirects, invite links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Backend REST API — Next.js proxies /api/* here
API_URL=http://localhost:4000

# WebSocket server for online multiplayer
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

| Variable | Required | Local | Production example |
|----------|----------|-------|-------------------|
| `NEXT_PUBLIC_APP_URL` | ✅ | `http://localhost:3000` | `https://chess.vercel.app` |
| `API_URL` | ✅ | `http://localhost:4000` | `https://chess-api.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | ✅ | `ws://localhost:3001` | `wss://chess-api.onrender.com` |

> ⚠️ `API_URL` is read at **build time** by `next.config.ts`. Set it in Vercel before deploying.

---

### Server — `server/.env.local`

```env
# Frontend URL — used for CORS and Google OAuth redirect base
APP_URL=http://localhost:3000

# Ports (defaults shown)
API_PORT=4000
WS_PORT=3001

# PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/dbname
DATABASE_SSL=true          # required for Neon / cloud hosts

# JWT
JWT_SECRET=your-very-long-random-secret-min-32-chars
JWT_EXPIRES_IN=7d

# Google OAuth (optional)
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
```

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_URL` | ✅ | Must exactly match frontend URL (no trailing slash) |
| `API_PORT` | ❌ | REST listen port (default `4000`) |
| `WS_PORT` | ❌ | WebSocket listen port (default `3001`) |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `DATABASE_SSL` | Cloud | Set `true` for Neon, Supabase, Railway |
| `JWT_SECRET` | ✅ | Signs auth tokens — use a long random string in prod |
| `JWT_EXPIRES_IN` | ❌ | Default `7d` |
| `GOOGLE_CLIENT_ID` | OAuth | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth | From Google Cloud Console |

---

## Database Setup

### Option A — Neon (recommended for production)

1. Create account at [neon.tech](https://neon.tech)
2. Create a new project → copy **connection string**
3. Paste into `server/.env.local`:
   ```env
   DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   DATABASE_SSL=true
   ```
4. Run migrations:
   ```bash
   cd server && npm run db:migrate
   ```

### Option B — Local Docker

```bash
cd server
docker compose up -d
```

Default credentials:

| Key | Value |
|-----|-------|
| Host | `localhost` |
| Port | `5432` |
| User | `chess` |
| Password | `chess` |
| Database | `chess` |

```env
DATABASE_URL=postgresql://chess:chess@localhost:5432/chess
# DATABASE_SSL not needed locally
```

```bash
npm run db:migrate
```

### Schema reference

#### `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `email` | varchar(255) | Nullable; unique |
| `username` | varchar(32) | Unique, required |
| `display_name` | varchar(64) | Shown in UI |
| `password_hash` | varchar(255) | Null for OAuth-only users |
| `avatar_url` | varchar(512) | Google profile photo |
| `elo` | integer | Default 1200 |
| `wins` / `losses` / `draws` | integer | Lifetime counts |
| `games_played` | integer | Total games |
| `created_at` / `updated_at` | timestamptz | Auto |

#### `oauth_accounts`

Links Google (or future providers) to `users.id`.

#### `games`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → users |
| `play_against` | varchar | `minimax` / `stockfish` / `human` / `online` |
| `result` | varchar | `win` / `loss` / `draw` |
| `rated` | boolean | Whether ELO was affected |
| `elo_before` / `elo_change` | integer | Rating snapshot |
| `history` | jsonb | Full move list for replay |
| `pgn` | text | Exported PGN string |
| `opening_name` | varchar | Detected opening |
| `time_control` | integer | Seconds (0 = none) |

### Migration commands

```bash
cd server

npm run db:migrate        # Apply all .sql files in drizzle/
npm run db:push           # Push Drizzle schema (dev only)
npm run db:studio         # Open Drizzle Studio GUI
npm run db:import-legacy  # Import old data/users.json (one-time)
```

---

## Running Locally

### All-in-one (recommended)

```bash
cd server
npm run dev:all
```

Starts:
- Express API on **http://localhost:4000**
- WebSocket on **ws://localhost:3001**
- Next.js on **http://localhost:3000**

### Separate terminals

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

### Production build (local test)

```bash
cd frontend && npm run build && npm start   # :3000
cd server && npm start                       # :4000 + :3001
```

### Health check

```bash
curl http://localhost:4000/health
# → {"ok":true,"service":"chess-server"}
```

---

## REST API Reference

**Base URL (direct):** `http://localhost:4000`  
**Base URL (via frontend proxy):** `http://localhost:3000/api`

**Auth header (protected routes):**
```
Authorization: Bearer <JWT>
```

---

### `POST /api/auth/register`

Create a new account.

**Request body:**
```json
{
  "username": "shubham",
  "password": "securepassword",
  "displayName": "Shubham Malik",
  "email": "optional@email.com"
}
```

**Response `200`:**
```json
{
  "token": "eyJhbG...",
  "user": {
    "id": "uuid",
    "username": "shubham",
    "displayName": "Shubham Malik",
    "stats": { "elo": 1200, "wins": 0, "losses": 0, "draws": 0, "gamesPlayed": 0 }
  }
}
```

---

### `POST /api/auth/login`

**Request body:**
```json
{ "username": "shubham", "password": "securepassword" }
```

**Response:** Same shape as register.

**Errors:** `401` invalid credentials, `503` database not configured.

---

### `GET /api/auth/me`

Returns current user + stats. Requires Bearer token.

**Response `200`:**
```json
{
  "user": {
    "id": "uuid",
    "username": "shubham",
    "displayName": "Shubham Malik",
    "email": null,
    "avatarUrl": null,
    "stats": { "elo": 1247, "wins": 12, "losses": 8, "draws": 3, "gamesPlayed": 23 }
  }
}
```

---

### `PATCH /api/auth/profile`

Update username or display name. Returns new token.

**Request body:**
```json
{ "username": "newname", "displayName": "New Display Name" }
```

---

### `GET /api/auth/google`

Redirects browser to Google OAuth consent screen.  
Sets `oauth_state` httpOnly cookie for CSRF protection.

---

### `GET /api/auth/google/callback`

Google redirects here after login. Server validates state, creates/finds user, then redirects to:

```
{APP_URL}?auth_token=<JWT>
```

On error: `{APP_URL}?auth_error=<message>`

---

### `GET /api/games`

List all saved games for authenticated user (newest first).

**Response `200`:**
```json
{
  "games": [
    {
      "id": "uuid",
      "playedAt": "2026-06-12T10:00:00.000Z",
      "playAgainst": "stockfish",
      "result": "win",
      "rated": true,
      "eloBefore": 1200,
      "eloChange": 18,
      "moveCount": 42,
      "openingName": "Italian Game",
      "timeControl": 300
    }
  ]
}
```

---

### `POST /api/games`

Save a completed game. Updates cloud stats for rated AI games.

**Request body:**
```json
{
  "playAgainst": "stockfish",
  "aiDifficulty": "medium",
  "humanColor": "white",
  "result": "win",
  "rated": true,
  "eloBefore": 1200,
  "eloChange": 16,
  "moveCount": 38,
  "openingName": "Sicilian Defense",
  "timeControl": 300,
  "pgn": "[Event \"Chess Master\"]...",
  "history": [[{ "from": 22, "to": 44, "piece": { ... } }]]
}
```

**Response `200`:**
```json
{
  "game": { "id": "uuid", ... },
  "stats": { "elo": 1216, "wins": 1, "losses": 0, "draws": 0, "gamesPlayed": 1 }
}
```

---

### `GET /api/games/:id`

Returns full game detail including `history` and `pgn` for replay.

---

### `GET /health`

```json
{ "ok": true, "service": "chess-server" }
```

---

## WebSocket Protocol

**Connect URL:**
```
ws://localhost:3001?token=<JWT>
```

Must be authenticated. Unauthenticated connections receive `error` and close with code `4401`.

### Client → Server messages

```typescript
// Create a room (you become White)
{ "type": "create_room", "timeControl": 300, "playerName": "Shubham" }

// Join existing room (you become Black)
{ "type": "join_room", "roomId": "6R7HVE", "playerName": "Friend" }

// Make a move
{ "type": "move", "roomId": "6R7HVE", "pieceName": "whitePawn4", "position": 44 }

// With promotion
{ "type": "move", "roomId": "6R7HVE", "pieceName": "whitePawn4", "position": 84, "promotionRank": "queen" }

// Resign
{ "type": "resign", "roomId": "6R7HVE" }

// Draw offer / accept / decline
{ "type": "draw_offer", "roomId": "6R7HVE" }
{ "type": "draw_accept", "roomId": "6R7HVE" }
{ "type": "draw_decline", "roomId": "6R7HVE" }

// Keepalive
{ "type": "ping" }
```

### Server → Client messages

```typescript
{ "type": "connected", "username": "Shubham" }
{ "type": "room_created", "roomId": "6R7HVE", "color": "white" }
{ "type": "room_joined", "roomId": "6R7HVE", "color": "black", "opponentConnected": true }
{ "type": "opponent_joined" }
{ "type": "game_start", "roomId": "6R7HVE", "color": "white", "timeControl": 300, "opponentName": "Friend" }
{ "type": "move", "roomId": "6R7HVE", "pieceName": "whitePawn4", "position": 44 }
{ "type": "game_over", "winner": "white", "winReason": "checkmate" }
{ "type": "game_over", "winner": "black", "winReason": "resignation" }
{ "type": "game_over", "drawReason": "stalemate" }
{ "type": "draw_offered" }
{ "type": "draw_declined" }
{ "type": "opponent_disconnected" }
{ "type": "opponent_reconnected" }
{ "type": "error", "message": "Room not found" }
{ "type": "pong" }
```

### Room lifecycle

```
Host: create_room → room_created (White) → waiting...
Guest: join_room → room_joined (Black) → game_start (both)
Moves: move ↔ move sync
End: checkmate | resign | timeout | draw → game_over
```

---

## Authentication Flows

### Username / Password

```
Client POST /api/auth/login
    → Server validates bcrypt hash
    → Returns JWT
    → Client stores in localStorage("chess_token")
    → All API calls: Authorization: Bearer <token>
    → WebSocket: ?token=<token>
```

### Google OAuth

```
1. User clicks "Sign in with Google"
2. Browser → GET /api/auth/google (via frontend proxy)
3. Server sets oauth_state cookie, redirects to Google
4. User approves → Google → GET /api/auth/google/callback?code=...&state=...
5. Server validates state cookie, exchanges code for profile
6. Server findOrCreateGoogleUser()
7. Redirect → {APP_URL}?auth_token=JWT
8. Frontend AuthContext picks up token, calls /api/auth/me
```

### Google Cloud Console setup

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create **OAuth 2.0 Client ID** → Web application
3. **Authorized redirect URIs** (add both):
   ```
   http://localhost:3000/api/auth/google/callback
   https://your-production-domain.com/api/auth/google/callback
   ```
4. Copy Client ID + Secret → `server/.env.local`
5. Set `APP_URL` to match your frontend URL exactly

> Redirect URI must be the **frontend** URL — `/api` is proxied to the backend by Next.js.

---

## Settings & Customization

Stored in `localStorage` under key `chess-master-settings`.

| Setting | Options | Default |
|---------|---------|---------|
| `theme` | `marble` / `green` / `brown` | `marble` |
| `pieceSet` | `neo` / `classic` | `neo` |
| `soundEnabled` | boolean | `true` |
| `animationSpeed` | `slow` / `normal` / `fast` | `normal` |
| `showMoveArrow` | boolean | `false` |
| `showTutorialOnStart` | boolean | `true` |
| `trackElo` | boolean | `true` |
| `showThreats` | boolean | `true` |

Access via the ⚙️ settings button in-game.

---

## Local Storage vs Cloud

| Data | Not logged in | Logged in |
|------|---------------|-----------|
| ELO & W/L/D | `localStorage` | PostgreSQL (synced on login) |
| Game history | `localStorage` (last N games) | PostgreSQL (unlimited) |
| Settings | `localStorage` | `localStorage` |
| JWT token | — | `localStorage` |
| Resume game | `localStorage` | `localStorage` |

On login, cloud stats **replace** local ELO if cloud value exists.

---

## Deployment Guide

### Overview

```
┌─────────────┐     HTTPS      ┌──────────────┐
│   Vercel    │ ──────────────►│    Neon      │
│  frontend/  │                │  PostgreSQL  │
└──────┬──────┘                └──────────────┘
       │ /api proxy
       ▼
┌─────────────┐
│   Render    │
│   server/   │
│  :4000 API  │
│  :3001 WS   │
└─────────────┘
```

---

### 1. Database — Neon

1. Create Neon project → copy connection string
2. Set `DATABASE_SSL=true`
3. From your machine (with prod `DATABASE_URL`):
   ```bash
   cd server && npm run db:migrate
   ```

---

### 2. Server — Render

| Setting | Value |
|---------|-------|
| Root Directory | `server` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Environment | Add all vars from `server/.env.example` |

**Environment variables on Render:**
```env
APP_URL=https://your-app.vercel.app
DATABASE_URL=postgresql://...
DATABASE_SSL=true
JWT_SECRET=<long-random-string>
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
API_PORT=4000
WS_PORT=3001
```

> **WebSocket on Render:** The server uses two ports locally. On Render you get one public port (`PORT`). You may need to configure `API_PORT` to match Render's `PORT` env var, and merge WebSocket onto the same HTTP server for production. Online multiplayer requires `wss://`.

**Verify:**
```bash
curl https://your-api.onrender.com/health
```

---

### 3. Frontend — Vercel

| Setting | Value |
|---------|-------|
| Root Directory | `frontend` |
| Framework | Next.js |
| Build Command | `npm run build` |
| Output | default |

**Environment variables on Vercel:**
```env
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
API_URL=https://your-api.onrender.com
NEXT_PUBLIC_WS_URL=wss://your-api.onrender.com
```

> Set these **before** the first deploy build.

---

### 4. Google OAuth — Production

Add to Google Console redirect URIs:
```
https://your-app.vercel.app/api/auth/google/callback
```

Update `APP_URL` on server to `https://your-app.vercel.app`.

---

### Production checklist

- [ ] Neon database created and migrated
- [ ] `JWT_SECRET` is a strong random string (not dev default)
- [ ] `DATABASE_SSL=true` on server
- [ ] `APP_URL` matches Vercel URL exactly
- [ ] Google OAuth redirect URI includes production domain
- [ ] `NEXT_PUBLIC_WS_URL` uses `wss://` (not `ws://`)
- [ ] `API_URL` set on Vercel before build
- [ ] `GET /health` returns `{ ok: true }` on production API
- [ ] Test: register → login → play AI → save game → check stats
- [ ] Test: online room create + join (if WS configured)

---

## Security Notes

| Topic | Implementation |
|-------|----------------|
| Passwords | bcrypt hashed, never stored plain |
| JWT | Signed with `jose`, HS256, configurable expiry |
| OAuth CSRF | `oauth_state` httpOnly cookie validated on callback |
| CORS | Restricted to `APP_URL` origin |
| WS auth | JWT required on connect; invalid token → close 4401 |
| SQL injection | Parameterized queries via Drizzle / pg |
| Cookies (OAuth) | `httpOnly`, `sameSite: lax`, `secure` in production |

**Do not commit** `.env.local` files — they are gitignored.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `API calls return 404` | Server not running or wrong `API_URL` | Start server; check `frontend/.env.local` |
| `WebSocket connection failed` | WS server down or wrong URL | Check `NEXT_PUBLIC_WS_URL`; ensure port 3001 open |
| `Google redirect_uri_mismatch` | Wrong URI in Google Console | Must be frontend URL + `/api/auth/google/callback` |
| `DATABASE_URL is not set` | Missing `server/.env.local` | Create file with valid connection string |
| `npm run db:migrate` fails | DB unreachable or SSL issue | Check `DATABASE_SSL=true` for cloud DBs |
| Stockfish not loading | WASM not copied | Run `npm install` in `frontend/` |
| Clock frozen during AI turn | Old build | Hard refresh; clock uses `useGameClock` + wall-clock extrapolation |
| Online resign shows checkmate | Old server build | Ensure `winReason: "resignation"` in server `roomManager.ts` |
| Google avatar broken | Referrer policy | `UserAvatar` uses `referrerPolicy="no-referrer"` |
| `redirect_uri_mismatch` in prod | `APP_URL` wrong | Must match exact Vercel domain |
| OAuth cookie not set | HTTP vs HTTPS | Production requires HTTPS for secure cookies |

---

## FAQ

**Q: Can I play without an account?**  
A: Yes — local vs human and vs AI work without login. Online multiplayer and cloud saves require an account.

**Q: Does online play affect ELO?**  
A: Not currently. ELO tracking is for AI games only when "Track ELO" is enabled.

**Q: Why are API and WebSocket on different ports?**  
A: Simpler local dev. Production hosts may require merging onto one port.

**Q: Can I use Supabase instead of Neon?**  
A: Yes — any PostgreSQL provider works. Set `DATABASE_URL` and `DATABASE_SSL=true`.

**Q: How do I reset my ELO?**  
A: Update directly in DB: `UPDATE users SET elo = 1200 WHERE username = '...'`

**Q: Where is the chess engine code?**  
A: Entirely in `frontend/src/lib/chess/`. Server imports it for online move validation.

**Q: Does it work on mobile?**  
A: Yes — responsive layout. Clocks move to player bars on small screens.

---

## Known Limitations

| Limitation | Notes |
|------------|-------|
| WebSocket on single Render port | May need code change to merge WS + HTTP for prod |
| No spectator mode | Rooms are 2-player only |
| No matchmaking | Private codes only, no public queue |
| Online games not saved to DB | Only AI games are persisted via `/api/games` |
| No email verification | Username registration is immediate |
| No password reset flow | Not implemented yet |
| `tsx` in production | Server runs TypeScript directly via tsx; consider compiling for prod |

---

## License

MIT License — Copyright (c) 2025 Shubham Malik.  
See [server/LICENSE](server/LICENSE) for full text.

---

<p align="center">
  <strong>Chess Master</strong> — Play smarter. Track your ELO. Challenge friends online.<br>
  Built with ♔ by Shubham Malik
</p>
