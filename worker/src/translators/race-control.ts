import type { AccumulatedState } from "../state-manager.js";
import type { OpenF1RaceControl } from "../types.js";

/**
 * Translate accumulated race control messages into OpenF1RaceControl array.
 */
export function translateRaceControl(
  state: AccumulatedState,
  sessionKey: number,
): OpenF1RaceControl[] {
  return state.raceControlMessages.map((entry) => ({
    session_key: sessionKey,
    date: entry.Utc ?? new Date().toISOString(),
    category: entry.Category ?? "Other",
    flag: entry.Flag,
    message: entry.Message ?? "",
    scope: entry.Scope,
    driver_number: entry.RacingNumber ? parseInt(entry.RacingNumber, 10) : undefined,
    lap_number: entry.Lap,
  }));
}
