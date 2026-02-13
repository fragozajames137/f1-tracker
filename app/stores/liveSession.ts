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
  year: number;
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
  setYear: (year: number) => void;
  setSelectedSessionKey: (key: number | null) => void;
  setSelectedDriverNumber: (num: number | null) => void;
  loadSessions: (year: number, signal?: AbortSignal) => Promise<void>;
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
  year: 2026,
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

  setYear: (year) => set({ year }),
  setSelectedSessionKey: (key) => set({ selectedSessionKey: key }),
  setSelectedDriverNumber: (num) => set({ selectedDriverNumber: num }),

  loadSessions: async (year, signal) => {
    set({ loading: true, error: null });
    try {
      const data = await liveProvider.getSessions(year, { signal });
      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.date_start).getTime() - new Date(a.date_start).getTime(),
      );

      // Pick the most recently started session (not a future one)
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

      // If this session has no data, try other past sessions in the current list
      if (driversData.length === 0) {
        const { sessions } = useLiveSessionStore.getState();
        const now = Date.now();
        const pastSessions = sessions.filter(
          (s) =>
            s.session_key !== sessionKey &&
            new Date(s.date_start).getTime() <= now,
        );
        // pastSessions is already sorted newest-first from loadSessions
        for (const s of pastSessions) {
          if (signal?.aborted) return;
          const testDrivers = await liveProvider
            .getSessionDrivers(s.session_key, { signal })
            .catch(() => []);
          if (testDrivers.length > 0) {
            // Found a session with data — switch to it and let effect re-trigger
            set({ selectedSessionKey: s.session_key });
            return;
          }
        }

        // If no session in the current year has data, try the previous year
        const { year } = useLiveSessionStore.getState();
        if (year >= 2024) {
          if (signal?.aborted) return;
          const prevSessions = await liveProvider
            .getSessions(year - 1, { signal })
            .catch(() => []);
          if (prevSessions.length > 0) {
            const sorted = [...prevSessions].sort(
              (a, b) =>
                new Date(b.date_start).getTime() -
                new Date(a.date_start).getTime(),
            );
            set({
              sessions: sorted,
              selectedSessionKey: sorted[0].session_key,
              year: year - 1,
            });
            return;
          }
        }
      }

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
