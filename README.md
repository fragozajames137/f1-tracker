# Pole to Paddock

A Formula 1 dashboard covering the 2026 season and the full history of the sport.

Live race timing, telemetry overlays, driver comparisons, contract tracker, grid predictor, and historical data going back to 1950.

## Features

- **Live Race Dashboard** — Real-time positions, gaps, pit stops, tire strategy, race control messages, team radio, weather, and rain radar
- **Penalty Tracker** — Active penalty points, consistency analysis, and FIA stewards decision database (2,200+ decisions from 2019–present, auto-synced)
- **Telemetry** — Speed traces, throttle/brake/gear data, and track maps for every session (2018–present)
- **Driver Comparison** — Head-to-head career and season stats with visual breakdowns
- **Driver & Team Profiles** — Full career histories, contract details, salary data, social links, and team heritage timelines
- **Silly Season Tracker** — 2026 grid with color-coded contract statuses, rumors, and sources
- **2027 Grid Predictor** — Drag-and-drop tool to build your predicted grid, shareable as an image or link
- **Race Schedule** — Full calendar with weekend session breakdowns, circuit info, and countdown timers
- **Race Hub** — Detailed race weekend pages with results, standings impact, and session drill-downs
- **Historical Archive** — Season standings, race results, lap charts, strategy timelines, pit stops, speed traps, weather, race control, track limits, and team radio from 1950 to present

## Tech Stack

- Next.js 16 (App Router) + React 19
- TypeScript + Tailwind CSS v4
- Turso (serverless SQLite) + Drizzle ORM
- Zustand for client state
- Cloudflare R2 for media storage (telemetry, team radio)
- Fly.io worker for live timing via SignalR (auto-starts/stops per race weekend)
- GitHub Actions for automated penalty sync, FIA document enrichment, and telemetry fetching

## Getting Started

```bash
npm install
cp .env.example .env.local  # add your Turso + R2 credentials
npx drizzle-kit push
npm run dev
```

## License

All rights reserved.
