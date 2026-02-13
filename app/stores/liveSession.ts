import { create } from "zustand";
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
import { liveProvider } from "@/app/lib/live-timing-provider";

interface LiveSessionState {
  // Session selection
  sessions: OpenF1Session[];
  selectedSessionKey: number | null;
  loading: boolean;
  error: string | null;

  // Session data
  drivers: OpenF1Driver[];
  positions: OpenF1Position[];
  laps: OpenF1Lap[];
  pitStops: OpenF1Pit[];
  intervals: OpenF1Interval[];
  raceControl: OpenF1RaceControl[];
  teamRadio: OpenF1TeamRadio[];
  weather: OpenF1Weather[];
  stints: OpenF1Stint[];

  // Driver detail
  selectedDriverNumber: number | null;
  driverLaps: OpenF1Lap[];

  // Actions
  setSelectedSessionKey: (key: number | null) => void;
  setSelectedDriverNumber: (num: number | null) => void;
  loadSessions: (signal?: AbortSignal) => Promise<void>;
  loadSessionData: (sessionKey: number, signal?: AbortSignal) => Promise<void>;
  loadDriverLaps: (
    sessionKey: number,
    driverNumber: number,
    signal?: AbortSignal,
  ) => Promise<void>;
  clearDriverLaps: () => void;
  setFastPollData: (data: {
    positions: OpenF1Position[];
    laps: OpenF1Lap[];
    intervals: OpenF1Interval[];
    stints: OpenF1Stint[];
  }) => void;
  setSlowPollData: (data: {
    raceControl: OpenF1RaceControl[];
    teamRadio: OpenF1TeamRadio[];
    weather: OpenF1Weather[];
    pitStops: OpenF1Pit[];
  }) => void;
}

export const useLiveSessionStore = create<LiveSessionState>()((set) => ({
  sessions: [],
  selectedSessionKey: null,
  loading: true,
  error: null,

  drivers: [],
  positions: [],
  laps: [],
  pitStops: [],
  intervals: [],
  raceControl: [],
  teamRadio: [],
  weather: [],
  stints: [],

  selectedDriverNumber: null,
  driverLaps: [],

  setSelectedSessionKey: (key) => set({ selectedSessionKey: key }),
  setSelectedDriverNumber: (num) => set({ selectedDriverNumber: num }),

  loadSessions: async (signal) => {
    set({ loading: true, error: null });
    try {
      const data = await liveProvider.getSessions({ signal });
      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.date_start).getTime() - new Date(a.date_start).getTime(),
      );

      // Auto-select: pick the most recently started session (not a future one),
      // or the last session in the list if all are future
      const now = Date.now();
      const started = sorted.filter(
        (s) => new Date(s.date_start).getTime() <= now,
      );
      const defaultSession =
        started.length > 0 ? started[0] : sorted.length > 0 ? sorted[sorted.length - 1] : null;

      set({
        sessions: sorted,
        selectedSessionKey: defaultSession?.session_key ?? null,
        loading: false,
      });
    } catch (err) {
      if (signal?.aborted) return;
      set({
        error: err instanceof Error ? err.message : "Failed to load sessions",
        loading: false,
      });
    }
  },

  loadSessionData: async (sessionKey, signal) => {
    try {
      const [
        driversData,
        positionsData,
        lapsData,
        pitsData,
        intervalsData,
        rcData,
        radioData,
        weatherData,
        stintsData,
      ] = await Promise.all([
        liveProvider.getSessionDrivers(sessionKey, { signal }),
        liveProvider.getPositions(sessionKey, { signal }),
        liveProvider.getLaps(sessionKey, undefined, { signal }),
        liveProvider.getPitStops(sessionKey, { signal }),
        liveProvider.getIntervals(sessionKey, { signal }).catch(() => []),
        liveProvider.getRaceControl(sessionKey, { signal }).catch(() => []),
        liveProvider.getTeamRadio(sessionKey, undefined, { signal }).catch(() => []),
        liveProvider.getWeather(sessionKey, { signal }).catch(() => []),
        liveProvider.getStints(sessionKey, { signal }),
      ]);

      if (signal?.aborted) return;

      set({
        drivers: driversData,
        positions: positionsData,
        laps: lapsData,
        pitStops: pitsData,
        intervals: intervalsData,
        raceControl: rcData,
        teamRadio: radioData,
        weather: weatherData,
        stints: stintsData,
      });
    } catch (err) {
      if (signal?.aborted) return;
      console.error("Failed to fetch session data:", err);
    }
  },

  loadDriverLaps: async (sessionKey, driverNumber, signal) => {
    try {
      const laps = await liveProvider.getLaps(sessionKey, driverNumber, { signal });
      if (!signal?.aborted) {
        set({ driverLaps: laps });
      }
    } catch {
      if (!signal?.aborted) {
        set({ driverLaps: [] });
      }
    }
  },

  clearDriverLaps: () => set({ driverLaps: [] }),

  setFastPollData: (data) =>
    set({
      positions: data.positions,
      laps: data.laps,
      intervals: data.intervals,
      stints: data.stints,
    }),

  setSlowPollData: (data) =>
    set({
      raceControl: data.raceControl,
      teamRadio: data.teamRadio,
      weather: data.weather,
      pitStops: data.pitStops,
    }),
}));
