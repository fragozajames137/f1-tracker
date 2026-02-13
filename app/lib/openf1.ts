import type {
  OpenF1Session,
  OpenF1Driver,
  OpenF1Position,
  OpenF1Lap,
  OpenF1Pit,
  OpenF1Interval,
  OpenF1RaceControl,
  OpenF1Weather,
  OpenF1TeamRadio,
  OpenF1Stint,
} from "@/app/types/openf1";

import grid2026 from "@/app/data/grid-2026.json";

const BASE_URL = "https://api.openf1.org/v1";
const MAX_RETRIES = 2;
const BACKOFF_MS = 3_000;

// Build a static lookup from driver number → grid info for enriching incomplete API data
const gridLookup = new Map<
  number,
  { name: string; team: string; colour: string; acronym: string; nationality: string; headshotUrl: string }
>();
for (const team of grid2026.teams) {
  for (const seat of [team.seat1, team.seat2]) {
    const parts = seat.name.split(" ");
    gridLookup.set(seat.number, {
      name: seat.name,
      team: team.name,
      colour: team.color.replace("#", ""),
      acronym: parts[parts.length - 1].slice(0, 3).toUpperCase(),
      nationality: seat.nationality,
      headshotUrl: seat.headshotUrl,
    });
  }
}

/** Fill in missing fields on OpenF1 drivers using local 2026 grid data. */
export function enrichDrivers(drivers: OpenF1Driver[]): OpenF1Driver[] {
  return drivers.map((d) => {
    const grid = gridLookup.get(d.driver_number);
    if (!grid) return d;
    // Only fill in fields that are null/empty from the API
    return {
      ...d,
      name_acronym: d.name_acronym || grid.acronym,
      full_name: d.full_name || grid.name,
      team_name: d.team_name || grid.team,
      team_colour: d.team_colour || grid.colour,
      first_name: d.first_name || grid.name.split(" ")[0],
      last_name: d.last_name || grid.name.split(" ").slice(1).join(" "),
      broadcast_name: d.broadcast_name || grid.name.split(" ").pop()!.toUpperCase(),
      country_code: d.country_code || grid.nationality,
      headshot_url: d.headshot_url || grid.headshotUrl,
    };
  });
}

async function fetchOpenF1<T>(
  endpoint: string,
  params: Record<string, string | number> = {},
  options?: { signal?: AbortSignal },
): Promise<T[]> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: options?.signal,
    });

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = res.headers.get("Retry-After");
      const waitMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : BACKOFF_MS * (attempt + 1);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (!res.ok) {
      throw new Error(`OpenF1 ${endpoint} failed: ${res.status}`);
    }
    return res.json();
  }

  throw new Error(`OpenF1 ${endpoint} failed after ${MAX_RETRIES} retries`);
}

export async function getSessions(
  year: number,
  options?: { signal?: AbortSignal },
): Promise<OpenF1Session[]> {
  return fetchOpenF1<OpenF1Session>("/sessions", { year }, options);
}

export async function getSessionDrivers(
  sessionKey: number,
  options?: { signal?: AbortSignal },
): Promise<OpenF1Driver[]> {
  const drivers = await fetchOpenF1<OpenF1Driver>("/drivers", { session_key: sessionKey }, options);
  return enrichDrivers(drivers);
}

export async function getPositions(
  sessionKey: number,
  options?: { signal?: AbortSignal },
): Promise<OpenF1Position[]> {
  return fetchOpenF1<OpenF1Position>("/position", { session_key: sessionKey }, options);
}

export async function getLaps(
  sessionKey: number,
  driverNumber?: number,
  options?: { signal?: AbortSignal },
): Promise<OpenF1Lap[]> {
  const params: Record<string, string | number> = {
    session_key: sessionKey,
  };
  if (driverNumber !== undefined) {
    params.driver_number = driverNumber;
  }
  return fetchOpenF1<OpenF1Lap>("/laps", params, options);
}

export async function getPitStops(
  sessionKey: number,
  options?: { signal?: AbortSignal },
): Promise<OpenF1Pit[]> {
  return fetchOpenF1<OpenF1Pit>("/pit", { session_key: sessionKey }, options);
}

export async function getIntervals(
  sessionKey: number,
  options?: { signal?: AbortSignal },
): Promise<OpenF1Interval[]> {
  return fetchOpenF1<OpenF1Interval>("/intervals", { session_key: sessionKey }, options);
}

export async function getRaceControl(
  sessionKey: number,
  options?: { signal?: AbortSignal },
): Promise<OpenF1RaceControl[]> {
  return fetchOpenF1<OpenF1RaceControl>("/race_control", { session_key: sessionKey }, options);
}

export async function getWeather(
  sessionKey: number,
  options?: { signal?: AbortSignal },
): Promise<OpenF1Weather[]> {
  return fetchOpenF1<OpenF1Weather>("/weather", { session_key: sessionKey }, options);
}

export async function getTeamRadio(
  sessionKey: number,
  driverNumber?: number,
  options?: { signal?: AbortSignal },
): Promise<OpenF1TeamRadio[]> {
  const params: Record<string, string | number> = { session_key: sessionKey };
  if (driverNumber !== undefined) params.driver_number = driverNumber;
  return fetchOpenF1<OpenF1TeamRadio>("/team_radio", params, options);
}

export async function getStints(
  sessionKey: number,
  options?: { signal?: AbortSignal },
): Promise<OpenF1Stint[]> {
  return fetchOpenF1<OpenF1Stint>("/stints", { session_key: sessionKey }, options);
}
