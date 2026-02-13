import type { AccumulatedState } from "../state-manager.js";
import type { OpenF1TeamRadio } from "../types.js";

const STATIC_BASE = "https://livetiming.formula1.com/static/";

/**
 * Translate accumulated team radio captures into OpenF1TeamRadio array.
 */
export function translateTeamRadio(
  state: AccumulatedState,
  sessionKey: number,
): OpenF1TeamRadio[] {
  return state.teamRadioCaptures
    .filter((c) => c.RacingNumber && c.Path)
    .map((capture) => ({
      session_key: sessionKey,
      driver_number: parseInt(capture.RacingNumber!, 10),
      date: capture.Utc ?? new Date().toISOString(),
      recording_url: capture.Path!.startsWith("http")
        ? capture.Path!
        : `${STATIC_BASE}${capture.Path}`,
    }));
}
