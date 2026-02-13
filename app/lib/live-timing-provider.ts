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
import {
  getSessions as openf1GetSessions,
  getSessionDrivers as openf1GetSessionDrivers,
  getPositions as openf1GetPositions,
  getLaps as openf1GetLaps,
  getPitStops as openf1GetPitStops,
  getIntervals as openf1GetIntervals,
  getRaceControl as openf1GetRaceControl,
  getWeather as openf1GetWeather,
  getTeamRadio as openf1GetTeamRadio,
  getStints as openf1GetStints,
} from "@/app/lib/openf1";

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface LiveTimingProvider {
  getSessions(year: number, opts?: { signal?: AbortSignal }): Promise<OpenF1Session[]>;
  getSessionDrivers(sessionKey: number, opts?: { signal?: AbortSignal }): Promise<OpenF1Driver[]>;
  getPositions(sessionKey: number, opts?: { signal?: AbortSignal }): Promise<OpenF1Position[]>;
  getLaps(sessionKey: number, driverNumber?: number, opts?: { signal?: AbortSignal }): Promise<OpenF1Lap[]>;
  getPitStops(sessionKey: number, opts?: { signal?: AbortSignal }): Promise<OpenF1Pit[]>;
  getIntervals(sessionKey: number, opts?: { signal?: AbortSignal }): Promise<OpenF1Interval[]>;
  getRaceControl(sessionKey: number, opts?: { signal?: AbortSignal }): Promise<OpenF1RaceControl[]>;
  getWeather(sessionKey: number, opts?: { signal?: AbortSignal }): Promise<OpenF1Weather[]>;
  getTeamRadio(sessionKey: number, driverNumber?: number, opts?: { signal?: AbortSignal }): Promise<OpenF1TeamRadio[]>;
  getStints(sessionKey: number, opts?: { signal?: AbortSignal }): Promise<OpenF1Stint[]>;
}

// ---------------------------------------------------------------------------
// OpenF1 provider — wraps existing functions (fallback / default)
// ---------------------------------------------------------------------------

const openF1Provider: LiveTimingProvider = {
  getSessions: openf1GetSessions,
  getSessionDrivers: openf1GetSessionDrivers,
  getPositions: openf1GetPositions,
  getLaps: openf1GetLaps,
  getPitStops: openf1GetPitStops,
  getIntervals: openf1GetIntervals,
  getRaceControl: openf1GetRaceControl,
  getWeather: openf1GetWeather,
  getTeamRadio: openf1GetTeamRadio,
  getStints: openf1GetStints,
};

// ---------------------------------------------------------------------------
// SignalR provider — fetches from /api/live/[topic], falls back to OpenF1
// ---------------------------------------------------------------------------

async function fetchLiveTopic<T>(
  topic: string,
  sessionKey: number,
  opts?: { signal?: AbortSignal },
): Promise<T[]> {
  const res = await fetch(
    `/api/live/${topic}?session_key=${sessionKey}`,
    { signal: opts?.signal },
  );
  if (!res.ok) throw new Error(`Live ${topic} failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

/** Stale threshold — if live_state data is older than 30s, fall back to OpenF1 */
const STALE_MS = 30_000;

async function fetchLiveTopicWithFallback<T>(
  topic: string,
  sessionKey: number,
  fallback: () => Promise<T[]>,
  opts?: { signal?: AbortSignal },
): Promise<T[]> {
  try {
    const res = await fetch(
      `/api/live/${topic}?session_key=${sessionKey}`,
      { signal: opts?.signal },
    );
    if (!res.ok) throw new Error(`${res.status}`);
    const json = await res.json();
    // If data is stale or empty, use OpenF1
    if (json.updated_at) {
      const age = Date.now() - new Date(json.updated_at).getTime();
      if (age > STALE_MS && (json.data?.length ?? 0) === 0) {
        return fallback();
      }
    }
    return json.data ?? [];
  } catch {
    return fallback();
  }
}

const signalRProvider: LiveTimingProvider = {
  // Sessions always come from OpenF1 — the worker doesn't store session lists
  getSessions: openf1GetSessions,

  getSessionDrivers: (sessionKey, opts) =>
    fetchLiveTopicWithFallback("drivers", sessionKey,
      () => openf1GetSessionDrivers(sessionKey, opts), opts),

  getPositions: (sessionKey, opts) =>
    fetchLiveTopicWithFallback("positions", sessionKey,
      () => openf1GetPositions(sessionKey, opts), opts),

  getLaps: (sessionKey, driverNumber, opts) =>
    fetchLiveTopicWithFallback<OpenF1Lap>("laps", sessionKey,
      () => openf1GetLaps(sessionKey, driverNumber, opts), opts)
      .then((laps) =>
        driverNumber !== undefined
          ? laps.filter((l) => l.driver_number === driverNumber)
          : laps,
      ),

  getPitStops: (sessionKey, opts) =>
    fetchLiveTopicWithFallback("pit_stops", sessionKey,
      () => openf1GetPitStops(sessionKey, opts), opts),

  getIntervals: (sessionKey, opts) =>
    fetchLiveTopicWithFallback("intervals", sessionKey,
      () => openf1GetIntervals(sessionKey, opts), opts),

  getRaceControl: (sessionKey, opts) =>
    fetchLiveTopicWithFallback("race_control", sessionKey,
      () => openf1GetRaceControl(sessionKey, opts), opts),

  getWeather: (sessionKey, opts) =>
    fetchLiveTopicWithFallback("weather", sessionKey,
      () => openf1GetWeather(sessionKey, opts), opts),

  getTeamRadio: (sessionKey, driverNumber, opts) =>
    fetchLiveTopicWithFallback<OpenF1TeamRadio>("team_radio", sessionKey,
      () => openf1GetTeamRadio(sessionKey, driverNumber, opts), opts)
      .then((radios) =>
        driverNumber !== undefined
          ? radios.filter((r) => r.driver_number === driverNumber)
          : radios,
      ),

  getStints: (sessionKey, opts) =>
    fetchLiveTopicWithFallback("stints", sessionKey,
      () => openf1GetStints(sessionKey, opts), opts),
};

// ---------------------------------------------------------------------------
// Export the active provider based on env var
// ---------------------------------------------------------------------------

const providerName =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_LIVE_PROVIDER
    : process.env.NEXT_PUBLIC_LIVE_PROVIDER;

export const liveProvider: LiveTimingProvider =
  providerName === "signalr" ? signalRProvider : openF1Provider;
