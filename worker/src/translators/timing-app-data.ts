import type { AccumulatedState } from "../state-manager.js";
import type { OpenF1Stint } from "../types.js";

/**
 * Translate accumulated TimingAppData stints into OpenF1Stint array.
 */
export function translateStints(
  state: AccumulatedState,
  sessionKey: number,
): OpenF1Stint[] {
  const lines = state.timingAppData.Lines;
  if (!lines) return [];

  const stints: OpenF1Stint[] = [];

  for (const [driverNum, line] of Object.entries(lines)) {
    if (!line.Stints) continue;

    const driverNumber = parseInt(driverNum, 10);
    const stintEntries = Object.entries(line.Stints).sort(
      ([a], [b]) => parseInt(a, 10) - parseInt(b, 10),
    );

    for (const [stintIdx, stint] of stintEntries) {
      const stintNumber = parseInt(stintIdx, 10) + 1; // 0-indexed to 1-indexed
      stints.push({
        session_key: sessionKey,
        driver_number: driverNumber,
        stint_number: stintNumber,
        compound: stint.Compound?.toUpperCase() ?? "UNKNOWN",
        tyre_age_at_start: stint.StartLaps ?? 0,
        lap_start: stint.StartLaps ?? 0,
        lap_end: stint.TotalLaps
          ? (stint.StartLaps ?? 0) + stint.TotalLaps
          : 0,
      });
    }
  }

  return stints;
}
