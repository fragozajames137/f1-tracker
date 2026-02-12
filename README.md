# Pole to Paddock

A real-time Formula 1 tracker for the 2026 season — driver contracts, silly season rumors, live race data, and historical standings, all in one place.

## Features

- **Silly Season Grid** — Every team and seat for 2026, color-coded by contract status (locked, expiring, open). Tap a driver to see rumors and sources.
- **Race Schedule** — Full 2026 calendar with weekend breakdowns, circuit details, and countdown to the next event.
- **Live Race Dashboard** — Real-time positions, gaps, pit stops, race control messages, team radio, and weather via OpenF1.
- **Telemetry Comparison** — Overlay speed traces, throttle, brake, and gear data for any two drivers in a session.
- **Driver Comparison** — Head-to-head stats: lap times, consistency, stint performance, and pace delta.
- **Historical Archive** — Season standings and race results going back to 1950, powered by the Jolpica (Ergast) API.

## Tech Stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript** + **Tailwind CSS v4**
- **Zustand** for global state management
- **Vitest** + **Testing Library** for tests
- **Sharp** image pipeline — optimized WebP thumbnails with blur placeholders

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Other Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Production build |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run optimize-images` | Regenerate optimized images and blur placeholders |

## Data Sources

| Source | Used for |
|--------|----------|
| [Jolpica API](https://api.jolpi.ca/ergast/f1/) | Historical standings, race results (1950–present) |
| [OpenF1 API](https://api.openf1.org/v1/) | Live telemetry, positions, weather (2023+) |
| Local JSON | 2026 grid, contracts, rumors, schedule |
