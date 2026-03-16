# Cult of the Lamb Dice Game (Knucklebones)

A browser-based rework of my first attempt from 3 years ago.

This project is inspired by the Knucklebones mini-game from *Cult of the Lamb* and recreates the core gameplay loop in a modern web app format.

> This is a fan project and is not affiliated with or endorsed by Massive Monster / Devolver Digital.

## Live Demo

**Vercel:** [https://cult-of-the-lamb-dice-game.vercel.app/](https://cult-of-the-lamb-dice-game.vercel.app/)

## What the Game Is

Knucklebones is a 1v1 dice duel:

- each side has a `3x3` board (3 columns, height 3);
- players take turns rolling a die (`1..6`);
- on each turn, the rolled die is placed into any non-full column;
- matching values in the same column index can destroy opponent dice;
- the game ends when a board is fully filled;
- higher total score wins.

## Core Rules

### Turn flow

1. Roll a die (`1..6`)
2. Choose an available column
3. Place the die on your board
4. Remove opponent dice with the same value in the matching column
5. Recalculate scores
6. Check endgame
7. Pass turn

### Column matching and destruction

Columns interact by index only:

- your left column affects opponent left column;
- your middle column affects opponent middle column;
- your right column affects opponent right column.

If you place value `X`, all opponent dice with value `X` in that matching column are removed.

### Scoring

Total board score:

`total = score(col1) + score(col2) + score(col3)`

Duplicate values in one column multiply value:

- if value `v` appears `n` times in a column,
- contribution is `v * n * n`.

Examples:

- `[4, 1, 4] = 4*2*2 + 1 = 17`
- `[6, 6] = 6*2*2 = 24`
- `[3, 3, 3] = 3*3*3 = 27`
- `[1, 5, 5] = 1 + 5*2*2 = 21`

## Current MVP Scope

Implemented:

- Player vs Bot match
- Full core rules and scoring
- Destroy mechanics by matching column
- Finished-state flow (win / lose / draw)
- Rematch and reset
- Modern UI layout and dice visuals

Not in MVP:

- Online multiplayer
- Mobile adaptation
- Sound/settings depth

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Zustand
- Vitest

## Roadmap

### ~~Phase 1~~

- ~~MVP with base rules and light design~~

### ~~Phase 2~~

- ~~Multiple bot difficulties~~
- ~~Score breakdown by column~~
- ~~Advanced dice animations~~

### Phase 3
- ~~Sound~~
- ~~Settings~~
- ~~Local mode (2 players on 1 device)~~

### ~~Phase 4~~

- ~~Auth (Google OAuth)~~
- ~~Leaderboard~~
- ~~Save statistics in database~~

### Phase 5

- Online mode
- Server-authoritative game logic
- Reconnect flow

### Phase 6
- Mobile adaptation
- Matchmaking

## How to Run


### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create a local `.env` file:

```bash
cp .env.example .env
```

Required variables:

- `DATABASE_URL` - Neon Postgres connection string
- `AUTH_SECRET` - random secret used by NextAuth
- `AUTH_GOOGLE_ID` - Google OAuth Client ID
- `AUTH_GOOGLE_SECRET` - Google OAuth Client Secret
- `NEXTAUTH_URL` - app URL (`http://localhost:3000` for local dev)

### 3) Sync database schema

For local development:

```bash
npx prisma db push
```

For migration-based workflow:

```bash
npm run prisma:migrate -- --name init
```

### 4) Start dev server

```bash
npm run dev
```

App will be available at [http://localhost:3000](http://localhost:3000).

### 5) Run quality checks

```bash
npm run test
npm run lint
npm run build
```

Optional:

```bash
npm run test:coverage
npm run format
npm run format:check
npm run prisma:generate
npm run prisma:studio
```

## Production Realtime Deploy

The web app can stay on `Vercel`, but the realtime Socket.IO server must run as a separate service.

Vercel does not support using Functions as a WebSocket server, so deploy `realtime/src/server.mjs` separately.

### Recommended free setup

- Web app: `Vercel`
- Realtime service: `Render Web Service (Free)`

> `Render Free` is fine for testing and hobby production, but free instances can spin down after inactivity and are not ideal for latency-sensitive production traffic.

### 1) Deploy the web app on Vercel

Keep the current app on Vercel as usual.

Required Vercel env vars:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NEXTAUTH_URL`
- `REALTIME_INTERNAL_SECRET`
- `REALTIME_JWT_SECRET`
- `NEXT_PUBLIC_REALTIME_URL` - set this after the realtime service is created

### 2) Deploy the realtime service on Render

1. Open `https://dashboard.render.com/`
2. Click `New +`
3. Click `Web Service`
4. Connect your GitHub repo
5. Select this repository

Use these settings:

- `Name`: `cult-of-the-lamb-realtime`
- `Runtime`: `Node`
- `Branch`: your production branch
- `Build Command`: `npm install`
- `Start Command`: `npm run realtime:start`
- `Instance Type`: `Free`

Set these Render env vars:

- `NODE_ENV=production`
- `SKIP_PRISMA_GENERATE=1`
- `WEB_ORIGIN=https://your-vercel-app-domain.vercel.app`
- `WEB_API_URL=https://your-vercel-app-domain.vercel.app`
- `REALTIME_INTERNAL_SECRET=<same value as on Vercel>`
- `REALTIME_JWT_SECRET=<same value as on Vercel>`
- `REALTIME_GRACE_PERIOD_MS=60000`

You do **not** need to set `PORT` manually on Render. Render provides it automatically.

You also do **not** need `DATABASE_URL` on the realtime service, because Prisma generation is skipped there.

### 3) Connect Vercel to the realtime service

After Render finishes deploy, copy the realtime URL, for example:

`https://cult-of-the-lamb-realtime.onrender.com`

Then go to your Vercel project:

1. Open `https://vercel.com/dashboard`
2. Open your project
3. Go to `Settings -> Environment Variables`
4. Set:

`NEXT_PUBLIC_REALTIME_URL=https://cult-of-the-lamb-realtime.onrender.com`

Redeploy the Vercel app after saving this variable.

### 4) Optional: use a custom domain

Recommended:

- web app: `https://yourdomain.com`
- realtime: `https://rt.yourdomain.com`

If you add a custom domain for realtime on Render, update:

- `NEXT_PUBLIC_REALTIME_URL`
- `WEB_ORIGIN`
- `WEB_API_URL`

### 5) Final production checklist

After both deploys are live, verify:

- Create room
- Join room by code
- Start match
- Both players connect to realtime
- Moves apply and persist correctly
- Close one tab and confirm the other player sees the `60s` reconnect state
- Reopen the app and confirm the reconnect action is visible on the home page
- Reconnect before timeout and continue playing
- Leave intentionally and confirm instant win for the opponent

### Summary of what runs where

- `Vercel`: Next.js app, database access, auth, REST APIs
- `Render`: Socket.IO realtime server only
