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

const BASE_URL = "https://api.openf1.org/v1";
const MAX_RETRIES = 2;
const BACKOFF_MS = 3_000;

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
  return fetchOpenF1<OpenF1Driver>("/drivers", { session_key: sessionKey }, options);
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
