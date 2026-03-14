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

- Auth
- Leaderboard
- Saved history/statistics
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

- Mobile adaptation (skipped until finsh of Phase 5)
- ~~Sound~~
- ~~Settings~~
- ~~Local mode (2 players on 1 device)~~

### Phase 4

- Auth
- Leaderboard
- Save statistics in database

### Phase 5

- Online mode
- Matchmaking
- Server-authoritative game logic
- Reconnect flow

## How to Run

### 1) Install dependencies

```bash
npm install
```

### 2) Start dev server

```bash
npm run dev
```

App will be available at [http://localhost:3000](http://localhost:3000).

### 3) Run quality checks

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
```
