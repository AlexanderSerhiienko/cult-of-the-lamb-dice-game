# Cult of the Lamb Dice Game (Knucklebones)

Browser remake of the `Knucklebones` dice duel from *Cult of the Lamb*.

This project recreates the original game loop in a modern web app with bot play, local multiplayer, online private rooms, auth, leaderboard, and a separate realtime service for Socket.IO gameplay.

> This is a fan project and is not affiliated with or endorsed by Massive Monster or Devolver Digital.

## Live Demo

- Web app: [https://cult-of-the-lamb-dice-game.vercel.app/](https://cult-of-the-lamb-dice-game.vercel.app/)

## Features

- Full `Knucklebones` rules and scoring
- Bot mode with multiple difficulties
- Local mode for 2 players on one device
- Online private rooms with room code join flow
- Server-authoritative realtime gameplay over Socket.IO
- Reconnect flow with disconnect grace period
- Google sign-in with NextAuth
- Leaderboard and persisted match history
- Sound and gameplay settings

## Rules Summary

`Knucklebones` is a `1v1` dice duel:

- each player has a `3x3` board
- players alternate turns
- each turn rolls a die from `1..6`
- the rolled die is placed in any non-full column
- placing value `X` destroys opponent dice with value `X` in the matching column
- when a board is full, the higher total score wins

Column score uses duplicate-based multiplication:

- if value `v` appears `n` times in one column, that group contributes `v * n * n`

Examples:

- `[4, 1, 4] = 17`
- `[6, 6] = 24`
- `[3, 3, 3] = 27`

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Zustand
- Prisma
- PostgreSQL
- NextAuth
- Socket.IO
- Vitest

## Project Status

Implemented:

- Bot mode
- Local multiplayer
- Online private rooms
- Authoritative realtime game server
- Reconnect and leave handling
- Auth and leaderboard
- Match persistence and statistics
- Mobile adaptation
- Public matchmaking

Planned next:

...

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a local `.env` file:

```bash
cp .env.example .env
```

Required app variables:

- `DATABASE_URL` - Postgres connection string
- `AUTH_SECRET` - random secret used by NextAuth
- `AUTH_GOOGLE_ID` - Google OAuth client ID
- `AUTH_GOOGLE_SECRET` - Google OAuth client secret
- `NEXTAUTH_URL` - app URL, usually `http://localhost:3000`
- `REALTIME_INTERNAL_SECRET` - shared secret used between web app and realtime service
- `REALTIME_JWT_SECRET` - shared JWT secret for room tokens
- `NEXT_PUBLIC_REALTIME_URL` - realtime server URL, for local dev usually `http://localhost:4001`

Realtime-only variables:

- `WEB_ORIGIN` - allowed web origin, usually `http://localhost:3000`
- `WEB_API_URL` - base URL of the Next.js app, usually `http://localhost:3000`
- `REALTIME_GRACE_PERIOD_MS` - reconnect grace period, for example `60000`

Optional production variables:

- `UPSTASH_REDIS_REST_URL` - shared Redis REST URL for distributed rate limiting
- `UPSTASH_REDIS_REST_TOKEN` - shared Redis REST token for distributed rate limiting

### 3. Sync the database schema

For local development:

```bash
npx prisma db push
```

For a migration-based workflow:

```bash
npm run prisma:migrate -- --name init
```

### 4. Start the app

Start the Next.js app:

```bash
npm run dev
```

Start the realtime server in a second terminal:

```bash
npm run realtime:dev
```

Local URLs:

- web app: [http://localhost:3000](http://localhost:3000)
- realtime server: `http://localhost:4001`

If you only want bot or local mode, the realtime server is not required. For online rooms, it is required.

## Quality Checks

Run:

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

## Production Deploy

The app is split into two deploy targets:

- `Vercel`: Next.js app, auth, database access, REST APIs
- `Render`: Socket.IO realtime server

### Why realtime is separate

Vercel Functions are not suitable as a WebSocket server, so the Socket.IO server must run as a separate long-lived service.

### Recommended free setup

- Web app: `Vercel`
- Realtime server: `Render Web Service (Free)`

`Render Free` is fine for hobby usage and testing, but it can spin down after inactivity.

## Deploy the Web App on Vercel

Required Vercel environment variables:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NEXTAUTH_URL`
- `REALTIME_INTERNAL_SECRET`
- `REALTIME_JWT_SECRET`
- `NEXT_PUBLIC_REALTIME_URL`

Important:

- `REALTIME_INTERNAL_SECRET` must exactly match the value on Render
- `REALTIME_JWT_SECRET` must exactly match the value on Render
- `NEXT_PUBLIC_REALTIME_URL` should be the Render HTTPS URL, for example `https://cult-of-the-lamb-realtime.onrender.com`

## Deploy the Realtime Server on Render

1. Open [https://dashboard.render.com/](https://dashboard.render.com/)
2. Click `New +`
3. Click `Web Service`
4. Connect GitHub
5. Select this repository

Use these settings:

- `Name`: `cult-of-the-lamb-realtime`
- `Runtime`: `Node`
- `Branch`: your production branch
- `Build Command`: `npm install`
- `Start Command`: `npm run realtime:start`
- `Instance Type`: `Free`

Render environment variables:

- `NODE_ENV=production`
- `SKIP_PRISMA_GENERATE=1`
- `WEB_ORIGIN=https://your-vercel-app-domain.vercel.app`
- `WEB_API_URL=https://your-vercel-app-domain.vercel.app`
- `REALTIME_INTERNAL_SECRET=<same value as on Vercel>`
- `REALTIME_JWT_SECRET=<same value as on Vercel>`
- `REALTIME_GRACE_PERIOD_MS=60000`

Notes:

- Do not set `PORT` manually on Render
- The realtime service does not need `DATABASE_URL`
- `SKIP_PRISMA_GENERATE=1` is required so the realtime service can install dependencies without Prisma setup
- For production-grade API rate limiting, configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` on the web app

## Production Checklist

After both deploys are live, verify:

- create room
- join room by code
- start match
- both players connect to realtime
- moves apply and persist correctly
- closing one tab shows the disconnect grace state to the other player
- reopening the app shows the reconnect action
- reconnecting before timeout restores the match
- intentional leave gives the opponent an immediate win

## Scripts

- `npm run dev` - start Next.js in development
- `npm run realtime:dev` - start the realtime server locally
- `npm run realtime:start` - start the realtime server in production mode
- `npm run test` - run tests
- `npm run lint` - run ESLint
- `npm run build` - generate Prisma client and build the Next.js app

## Notes

- The web app signs realtime room tokens, and the realtime service validates them
- If realtime connection fails with `invalid signature`, check that `REALTIME_JWT_SECRET` matches on Vercel and Render
- If internal realtime persistence fails, check that `REALTIME_INTERNAL_SECRET` matches on Vercel and Render
