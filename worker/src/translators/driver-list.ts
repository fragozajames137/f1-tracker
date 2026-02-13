import type { AccumulatedState } from "../state-manager.js";
import type { OpenF1Driver } from "../types.js";

/**
 * Translate accumulated DriverList into OpenF1Driver array.
 */
export function translateDrivers(
  state: AccumulatedState,
  sessionKey: number,
): OpenF1Driver[] {
  const list = state.driverList;
  if (!list) return [];

  const drivers: OpenF1Driver[] = [];

  for (const [driverNum, entry] of Object.entries(list)) {
    // Skip non-driver keys (SignalR may include metadata keys)
    if (!entry || typeof entry !== "object") continue;
    if (!entry.RacingNumber && !entry.Tla) continue;

    drivers.push({
      session_key: sessionKey,
      driver_number: parseInt(entry.RacingNumber ?? driverNum, 10),
      broadcast_name: entry.BroadcastName ?? "",
      full_name: entry.FullName ?? "",
      name_acronym: entry.Tla ?? "",
      team_name: entry.TeamName ?? "",
      team_colour: entry.TeamColour ?? "",
      first_name: entry.FirstName ?? "",
      last_name: entry.LastName ?? "",
      headshot_url: entry.HeadshotUrl,
      country_code: entry.CountryCode ?? "",
    });
  }

  return drivers;
}
