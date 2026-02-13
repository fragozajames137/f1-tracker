import { log } from "./utils.js";

// ---------------------------------------------------------------------------
// Jolpica API types
// ---------------------------------------------------------------------------

interface SessionTime {
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM:SSZ"
}

interface JolpicaRace {
  season: string;
  round: string;
  raceName: string;
  date: string;
  time: string;
  FirstPractice?: SessionTime;
  SecondPractice?: SessionTime;
  ThirdPractice?: SessionTime;
  Qualifying?: SessionTime;
  Sprint?: SessionTime;
  SprintQualifying?: SessionTime;
}

interface JolpicaResponse {
  MRData: {
    RaceTable: {
      Races: JolpicaRace[];
    };
  };
}

// ---------------------------------------------------------------------------
// Scheduled session — a single session with its start time
// ---------------------------------------------------------------------------

export interface ScheduledSession {
  round: number;
  raceName: string;
  sessionName: string;
  startTime: Date;
  durationMs: number; // estimated session duration in ms
}

const JOLPICA_URL = "https://api.jolpi.ca/ergast/f1/2026.json";
const WAKE_BEFORE_MS = 60 * 60 * 1000; // 1 hour before session
const POST_RACE_BUFFER_MS = 4 * 60 * 60 * 1000; // Stay awake 4h after last session ends

// ---------------------------------------------------------------------------
// Pre-season testing — not in the Jolpica/Ergast calendar
// Bahrain 2026: Feb 10-12, 23:00-08:00 UTC each day (night testing)
// ---------------------------------------------------------------------------

const NINE_HOURS = 9 * 60 * 60 * 1000;
const THREE_HOURS = 3 * 60 * 60 * 1000;

const PRE_SEASON_TESTING: ScheduledSession[] = [
  { round: 0, raceName: "Bahrain Pre-Season Test", sessionName: "Day 1", startTime: new Date("2026-02-10T23:00:00Z"), durationMs: NINE_HOURS },
  { round: 0, raceName: "Bahrain Pre-Season Test", sessionName: "Day 2", startTime: new Date("2026-02-11T23:00:00Z"), durationMs: NINE_HOURS },
  { round: 0, raceName: "Bahrain Pre-Season Test", sessionName: "Day 3", startTime: new Date("2026-02-12T23:00:00Z"), durationMs: NINE_HOURS },
];

/**
 * Fetch the 2026 F1 calendar from Jolpica and return a sorted list of
 * every session start time, including pre-season testing.
 */
export async function fetchSchedule(): Promise<ScheduledSession[]> {
  const res = await fetch(JOLPICA_URL);
  if (!res.ok) {
    throw new Error(`Jolpica API returned ${res.status}`);
  }

  const data: JolpicaResponse = await res.json();
  const races = data.MRData.RaceTable.Races;
  const sessions: ScheduledSession[] = [...PRE_SEASON_TESTING];

  for (const race of races) {
    const round = parseInt(race.round, 10);
    const name = race.raceName;

    const add = (sessionName: string, st: SessionTime | undefined, duration = THREE_HOURS) => {
      if (!st) return;
      const start = new Date(`${st.date}T${st.time}`);
      if (!isNaN(start.getTime())) {
        sessions.push({ round, raceName: name, sessionName, startTime: start, durationMs: duration });
      }
    };

    add("FP1", race.FirstPractice);
    add("FP2", race.SecondPractice);
    add("Sprint Qualifying", race.SprintQualifying);
    add("FP3", race.ThirdPractice);
    add("Sprint", race.Sprint);
    add("Qualifying", race.Qualifying);
    add("Race", { date: race.date, time: race.time });
  }

  sessions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  return sessions;
}

/**
 * Find the next race weekend the worker should wake up for.
 * Wakes 1h before the first session of the weekend (FP1) and stays awake
 * until the last session (Race) has ended.
 *
 * Returns the first session of the weekend, how long to sleep, and the end
 * time of the entire weekend.
 */
export function findNextWakeup(
  sessions: ScheduledSession[],
  now: Date = new Date(),
): { session: ScheduledSession; sleepMs: number; weekendEndMs: number } | null {
  // Group sessions by round
  const rounds = new Map<number, ScheduledSession[]>();
  for (const s of sessions) {
    if (!rounds.has(s.round)) rounds.set(s.round, []);
    rounds.get(s.round)!.push(s);
  }

  // Find the first round whose last session hasn't ended yet
  const sortedRounds = [...rounds.entries()].sort(
    ([, a], [, b]) => a[0].startTime.getTime() - b[0].startTime.getTime(),
  );

  for (const [, roundSessions] of sortedRounds) {
    // Last session in the weekend + 4h buffer for delayed data
    const lastSession = roundSessions[roundSessions.length - 1];
    const weekendEndMs =
      lastSession.startTime.getTime() + lastSession.durationMs + POST_RACE_BUFFER_MS;

    // If the weekend isn't over yet
    if (now.getTime() < weekendEndMs) {
      // Wake up 1h before the first session of the weekend
      const firstSession = roundSessions[0];
      const wakeTime = firstSession.startTime.getTime() - WAKE_BEFORE_MS;
      const sleepMs = Math.max(0, wakeTime - now.getTime());

      return { session: firstSession, sleepMs, weekendEndMs };
    }
  }

  return null;
}

/**
 * Log the next few upcoming sessions for visibility.
 */
export function logUpcoming(sessions: ScheduledSession[], count = 5): void {
  const now = new Date();
  const upcoming = sessions.filter(
    (s) => s.startTime.getTime() > now.getTime(),
  );
  const preview = upcoming.slice(0, count);

  if (preview.length === 0) {
    log("No upcoming sessions in schedule");
    return;
  }

  log(`Next ${preview.length} sessions:`);
  for (const s of preview) {
    const diff = s.startTime.getTime() - now.getTime();
    const hours = Math.round(diff / (1000 * 60 * 60));
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    const eta = days > 1 ? `${days}d` : `${hours}h`;
    log(`  ${s.raceName} ${s.sessionName} — ${s.startTime.toUTCString()} (in ${eta})`);
  }
}
