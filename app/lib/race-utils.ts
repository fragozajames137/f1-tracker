import type { Race } from "@/app/types";

export type RaceState = "pre" | "live" | "post";

/**
 * Determine whether a race weekend is in pre-session, live, or post-race state.
 */
export function determineRaceState(
  race: Race | null,
  sessions: { startDate: string | null; endDate: string | null; sessionType: string }[],
): RaceState {
  if (!race) return "post";

  const now = Date.now();

  // Use race date + time as the ultimate end marker
  const raceEnd = new Date(`${race.date}T${race.time}`).getTime() + 3 * 60 * 60 * 1000; // race + 3h buffer
  if (now > raceEnd) return "post";

  // Check if FP1 has started (first session)
  const fp1 = race.FirstPractice;
  if (fp1) {
    const fp1Start = new Date(`${fp1.date}T${fp1.time}`).getTime();
    if (now < fp1Start) return "pre";
  }

  // Check if any session is currently running (from ingested data)
  for (const session of sessions) {
    if (!session.startDate || !session.endDate) continue;
    const start = new Date(session.startDate).getTime();
    const end = new Date(session.endDate).getTime();
    if (now >= start && now <= end + 30 * 60 * 1000) return "live"; // 30min buffer
  }

  // Between sessions during the weekend
  return "pre";
}

/**
 * Find the current or next upcoming race from a schedule.
 * Returns the race that is either in progress (FP1 started but race not ended)
 * or the next one whose race date hasn't passed.
 */
export function findCurrentRace(races: Race[]): { race: Race; index: number } | null {
  if (races.length === 0) return null;

  const now = Date.now();

  for (let i = 0; i < races.length; i++) {
    const race = races[i];
    const raceEnd = new Date(`${race.date}T${race.time}`).getTime() + 3 * 60 * 60 * 1000;

    // Race weekend still in progress or hasn't happened yet
    if (now < raceEnd) {
      return { race, index: i };
    }
  }

  // All races are in the past — return the last one
  return { race: races[races.length - 1], index: races.length - 1 };
}
