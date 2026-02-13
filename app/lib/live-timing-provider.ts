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
  enrichDrivers,
} from "@/app/lib/openf1";

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface LiveTimingProvider {
  getSessions(opts?: { signal?: AbortSignal }): Promise<OpenF1Session[]>;
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

const CURRENT_YEAR = 2026;

const openF1Provider: LiveTimingProvider = {
  getSessions: (opts) => openf1GetSessions(CURRENT_YEAR, opts),
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
    const data = json.data ?? [];
    // If DB has no data at all for this topic, fall back to OpenF1
    if (data.length === 0 && !json.updated_at) {
      return fallback();
    }
    return data;
  } catch {
    return fallback();
  }
}

/**
 * Fetch sessions from our DB endpoint, falling back to OpenF1 if empty.
 */
async function fetchAvailableSessions(
  opts?: { signal?: AbortSignal },
): Promise<OpenF1Session[]> {
  try {
    const res = await fetch("/api/live/available-sessions", {
      signal: opts?.signal,
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const json = await res.json();
    const sessions: OpenF1Session[] = json.sessions ?? [];
    if (sessions.length > 0) return sessions;
  } catch {
    // Fall through to OpenF1
  }
  // Fallback: no worker data, try OpenF1 directly
  return openf1GetSessions(CURRENT_YEAR, opts);
}

const signalRProvider: LiveTimingProvider = {
  getSessions: fetchAvailableSessions,

  getSessionDrivers: (sessionKey, opts) =>
    fetchLiveTopicWithFallback<OpenF1Driver>("drivers", sessionKey,
      () => openf1GetSessionDrivers(sessionKey, opts), opts)
      .then(enrichDrivers),

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
