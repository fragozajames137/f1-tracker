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
- **Turso** (serverless SQLite) + **Drizzle ORM** for session-level F1 data
- **Zustand** for global state management
- **Vitest** + **Testing Library** for tests
- **Sharp** image pipeline — optimized WebP thumbnails with blur placeholders

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Database Setup

The app uses [Turso](https://turso.tech) for storing detailed session data (lap positions, tire strategies, pit stops, weather, race control messages) ingested from the F1 Live Timing Static API.

1. Install the Turso CLI: `brew install tursodatabase/tap/turso`
2. Authenticate: `turso auth login`
3. Create a database: `turso db create f1-tracker`
4. Get credentials and add them to `.env.local`:
   ```
   TURSO_DATABASE_URL=libsql://f1-tracker-<your-org>.turso.io
   TURSO_AUTH_TOKEN=<your-token>
   ```
5. Push the schema: `npx drizzle-kit push`
6. Ingest data:
   ```bash
   npx tsx scripts/ingest-static.ts --year 2025   # single season
   npx tsx scripts/ingest-static.ts --all          # all seasons (2018-2026)
   npx tsx scripts/ingest-static.ts --year 2025 --force  # re-ingest
   ```

### Other Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Production build |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run optimize-images` | Regenerate optimized images and blur placeholders |
| `npx drizzle-kit push` | Push DB schema to Turso |
| `npx drizzle-kit studio` | Open Drizzle Studio (DB browser) |

## Data Sources

| Source | Used for |
|--------|----------|
| [Jolpica API](https://api.jolpi.ca/ergast/f1/) | Historical standings, race results (1950–present) |
| [OpenF1 API](https://api.openf1.org/v1/) | Live telemetry, positions, weather (2023+) |
| [F1 Live Timing Static API](https://livetiming.formula1.com/static/) | Session data: lap positions, tire strategies, pit stops, weather, race control (2018+) |
| [Turso DB](https://turso.tech) | Ingested session data served via API routes |
| Local JSON | 2026 grid, driver contracts, GP contracts, schedule, driver numbers, constructors, circuits, and full historical driver/team/race reference data |

## Reference Data (`app/data/`)

| File | Contents |
|------|----------|
| `grid-2026.json` | 2026 grid — all 11 teams, 22 drivers, team colors |
| `driver-contracts-2026.json` | Driver contract end years, deal types, estimated salaries |
| `driver-numbers.json` | Permanent numbers (1–99) since 2014, temporary numbers, #1 history, #17 retired for Bianchi |
| `gp-contracts-2026.json` | Grand Prix hosting contracts and calendar through 2026 |
| `gp-race-titles.json` | All 54 F1 race titles with years held and circuits used |
| `gp-host-nations.json` | 34 host nations with race counts and circuits |
| `gp-circuits.json` | 77 circuits with locations, race history, and contract status |
| `f1-drivers.json` | Every F1 driver in history (877) with full career stats |
| `f1-drivers-by-country.json` | Driver totals by country (41 nations), champions, and current grid |
| `f1-constructors.json` | 11 current + ~135 former constructors with stats and team lineages |
| `engine-manufacturers.json` | Historical engine manufacturers and supply records |

## API Routes

| Endpoint | Description |
|----------|-------------|
| `GET /api/sessions?year=&type=` | Session list with meeting info |
| `GET /api/sessions/[key]` | Session detail with drivers and status timeline |
| `GET /api/sessions/[key]/laps?driver=&from=&to=` | Lap timing data |
| `GET /api/sessions/[key]/lap-chart` | Position per lap for all drivers |
| `GET /api/sessions/[key]/strategy` | Tire stints and pit stops per driver |
| `GET /api/sessions/[key]/weather` | Weather time series |
| `GET /api/sessions/[key]/race-control` | Race control messages |
| `GET /api/sessions/[key]/pit-stops` | Pit stop data with driver info |
| `GET /api/history/[year]` | Historical standings and results |
| `GET /api/telemetry?file=` | Telemetry session data |
