import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, "..", "cache");

// ── Hardcoded 2025 calendar (season complete) ───────────────────────────────
export const GP_CALENDAR_2025 = {
  "Australian Grand Prix": { round: 1, date: "2025-03-16" },
  "Chinese Grand Prix": { round: 2, date: "2025-03-23" },
  "Japanese Grand Prix": { round: 3, date: "2025-04-06" },
  "Bahrain Grand Prix": { round: 4, date: "2025-04-13" },
  "Miami Grand Prix": { round: 5, date: "2025-05-04" },
  "Emilia Romagna Grand Prix": { round: 6, date: "2025-05-18" },
  "Monaco Grand Prix": { round: 7, date: "2025-05-25" },
  "Spanish Grand Prix": { round: 8, date: "2025-06-01" },
  "Canadian Grand Prix": { round: 9, date: "2025-06-15" },
  "Austrian Grand Prix": { round: 10, date: "2025-06-29" },
  "British Grand Prix": { round: 11, date: "2025-07-06" },
  "Belgian Grand Prix": { round: 12, date: "2025-07-27" },
  "Hungarian Grand Prix": { round: 13, date: "2025-08-03" },
  "Dutch Grand Prix": { round: 14, date: "2025-08-31" },
  "Italian Grand Prix": { round: 15, date: "2025-09-07" },
  "Azerbaijan Grand Prix": { round: 16, date: "2025-09-21" },
  "Singapore Grand Prix": { round: 17, date: "2025-10-05" },
  "United States Grand Prix": { round: 18, date: "2025-10-19" },
  "Mexico City Grand Prix": { round: 19, date: "2025-10-26" },
  "São Paulo Grand Prix": { round: 20, date: "2025-11-09" },
  "Las Vegas Grand Prix": { round: 21, date: "2025-11-22" },
  "Qatar Grand Prix": { round: 22, date: "2025-11-30" },
  "Abu Dhabi Grand Prix": { round: 23, date: "2025-12-07" },
};

// ── Fetch race calendar from Jolpica API ────────────────────────────────────
export async function fetchRaceCalendar(season) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

  const cachePath = join(CACHE_DIR, `jolpica-${season}.json`);

  // Check cache (24h TTL)
  if (existsSync(cachePath)) {
    const stat = JSON.parse(readFileSync(cachePath, "utf-8"));
    const age = Date.now() - stat._cachedAt;
    if (age < 86400000) return stat.races;
  }

  const url = `https://api.jolpi.ca/ergast/f1/${season}.json`;
  const res = await fetch(url, {
    headers: { "User-Agent": "f1-tracker-sync/1.0" },
  });
  if (!res.ok) throw new Error(`Jolpica API error: ${res.status}`);

  const data = await res.json();
  const races = data.MRData.RaceTable.Races;

  writeFileSync(
    cachePath,
    JSON.stringify({ _cachedAt: Date.now(), races }, null, 2),
  );
  return races;
}

// ── Get GP calendar for a season (Jolpica or hardcoded fallback) ────────────
export async function getGpCalendar(season) {
  if (season === 2025) return GP_CALENDAR_2025;

  try {
    const races = await fetchRaceCalendar(season);
    const calendar = {};
    for (const race of races) {
      // Strip "Grand Prix" suffix variations for key
      calendar[race.raceName] = {
        round: parseInt(race.round),
        date: race.date,
      };
    }
    return calendar;
  } catch (err) {
    console.warn(`⚠ Could not fetch ${season} calendar: ${err.message}`);
    if (season === 2026) {
      // Fallback: return empty — will be populated as FIA announces dates
      return {};
    }
    return {};
  }
}

// ── Race weekend window detection ───────────────────────────────────────────
export async function getRaceWeekendWindows(season) {
  const races = await fetchRaceCalendar(season);
  const windows = [];

  for (const race of races) {
    // Find earliest session start
    const sessions = [
      race.FirstPractice,
      race.SecondPractice,
      race.ThirdPractice,
      race.SprintQualifying,
      race.Sprint,
      race.Qualifying,
    ].filter(Boolean);

    let windowStart;
    if (sessions.length > 0) {
      const earliest = sessions.reduce((min, s) => {
        const t = new Date(`${s.date}T${s.time}`);
        return t < min ? t : min;
      }, new Date(`${sessions[0].date}T${sessions[0].time}`));
      windowStart = earliest;
    } else {
      // Fallback: race day minus 2 days at midnight UTC
      const raceDate = new Date(`${race.date}T${race.time || "14:00:00Z"}`);
      windowStart = new Date(raceDate.getTime() - 2 * 86400000);
    }

    // Race end + 2h buffer
    const raceTime = new Date(`${race.date}T${race.time || "14:00:00Z"}`);
    const windowEnd = new Date(raceTime.getTime() + 4 * 3600000); // race ~2h + 2h buffer

    windows.push({
      raceName: race.raceName,
      round: parseInt(race.round),
      windowStart,
      windowEnd,
    });
  }

  return windows;
}

export async function isRaceWeekend(season) {
  const now = new Date();
  const windows = await getRaceWeekendWindows(season);

  for (const w of windows) {
    if (now >= w.windowStart && now <= w.windowEnd) {
      return { active: true, race: w };
    }
  }

  const nextRace = windows.find((w) => w.windowStart > now) || null;
  return { active: false, race: null, nextRace };
}
