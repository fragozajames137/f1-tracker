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
import {
  getSessions,
  getSessionDrivers,
  getPositions,
  getLaps,
  getPitStops,
  getIntervals,
  getRaceControl,
  getWeather,
  getTeamRadio,
  getStints,
} from "@/app/lib/openf1";

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
      const data = await getSessions(year, { signal });
      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.date_start).getTime() - new Date(a.date_start).getTime(),
      );
      set({
        sessions: sorted,
        selectedSessionKey: sorted.length > 0 ? sorted[0].session_key : null,
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
        getSessionDrivers(sessionKey, { signal }),
        getPositions(sessionKey, { signal }),
        getLaps(sessionKey, undefined, { signal }),
        getPitStops(sessionKey, { signal }),
        getIntervals(sessionKey, { signal }).catch(() => []),
        getRaceControl(sessionKey, { signal }).catch(() => []),
        getTeamRadio(sessionKey, undefined, { signal }).catch(() => []),
        getWeather(sessionKey, { signal }).catch(() => []),
        getStints(sessionKey, { signal }),
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
      const laps = await getLaps(sessionKey, driverNumber, { signal });
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
