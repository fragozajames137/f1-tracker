# Pole to Paddock

A real-time Formula 1 dashboard for the 2026 season.

Live race timing, telemetry overlays, driver comparisons, contract tracker, and historical data going back to 1950.

## Features

- **Live Race Dashboard** — Real-time positions, gaps, pit stops, tire strategy, race control messages, team radio, weather, and rain radar
- **Telemetry** — Speed traces, throttle, brake, and gear data for any session
- **Driver Comparison** — Head-to-head stats: lap times, consistency, stint performance, and pace delta
- **Silly Season Grid** — 2026 teams and seats, color-coded by contract status with rumors and sources
- **Race Schedule** — Full calendar with weekend breakdowns, circuit info, and countdown timers
- **Historical Archive** — Season standings and race results from 1950 to present

## Tech Stack

- Next.js 16 (App Router) + React 19
- TypeScript + Tailwind CSS v4
- Turso (serverless SQLite) + Drizzle ORM
- Zustand for state management
- Live timing worker with schedule-aware sleep/wake

## Getting Started

```bash
npm install
cp .env.example .env.local  # add your Turso credentials
npx drizzle-kit push
npm run dev
```

## License

All rights reserved.
