import type { AccumulatedState } from "../state-manager.js";
import type { OpenF1Session } from "../types.js";

/**
 * Translate accumulated SessionInfo into OpenF1Session.
 * Returns null if no session info is available.
 */
export function translateSession(
  state: AccumulatedState,
  sessionKey: number,
): OpenF1Session | null {
  const info = state.sessionInfo;
  if (!info || !info.Key) return null;

  return {
    session_key: sessionKey,
    session_name: info.Name ?? "",
    session_type: info.Type ?? "",
    date_start: info.StartDate ?? "",
    date_end: info.EndDate ?? "",
    gmt_offset: info.GmtOffset ?? "+00:00",
    country_key: info.Meeting?.Country?.Key ?? 0,
    country_code: info.Meeting?.Country?.Code ?? "",
    country_name: info.Meeting?.Country?.Name ?? "",
    circuit_key: info.Meeting?.Circuit?.Key ?? 0,
    circuit_short_name: info.Meeting?.Circuit?.ShortName ?? "",
    location: info.Meeting?.Location ?? "",
    year: info.StartDate
      ? new Date(info.StartDate).getFullYear()
      : new Date().getFullYear(),
  };
}
