import { create } from "zustand";
import { persist } from "zustand/middleware";

type SpeedUnit = "kph" | "mph";
type TempUnit = "C" | "F";
type TimeFormat = "12h" | "24h";

const MAX_FAVORITE_DRIVERS = 2;

interface PreferencesState {
  // Units
  speedUnit: SpeedUnit;
  tempUnit: TempUnit;
  timeFormat: TimeFormat;
  setSpeedUnit: (unit: SpeedUnit) => void;
  setTempUnit: (unit: TempUnit) => void;
  setTimeFormat: (format: TimeFormat) => void;
  toggleUnits: () => void;

  // Favorites
  favoriteTeamId: string | null;
  favoriteDriverIds: string[];
  setFavoriteTeam: (teamId: string | null) => void;
  toggleFavoriteDriver: (driverId: string) => void;
  setFavoriteDrivers: (ids: string[]) => void;

  // Welcome flow
  hasCompletedWelcome: boolean;
  completeWelcome: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      // Units
      speedUnit: "mph",
      tempUnit: "F",
      timeFormat: "12h",
      setSpeedUnit: (unit) => set({ speedUnit: unit }),
      setTempUnit: (unit) => set({ tempUnit: unit }),
      setTimeFormat: (format) => set({ timeFormat: format }),
      toggleUnits: () =>
        set((s) => ({
          tempUnit: s.tempUnit === "C" ? "F" : "C",
          speedUnit: s.speedUnit === "kph" ? "mph" : "kph",
        })),

      // Favorites
      favoriteTeamId: null,
      favoriteDriverIds: [],
      setFavoriteTeam: (teamId) => set({ favoriteTeamId: teamId }),
      toggleFavoriteDriver: (driverId) =>
        set((s) => {
          if (s.favoriteDriverIds.includes(driverId)) {
            return { favoriteDriverIds: s.favoriteDriverIds.filter((id) => id !== driverId) };
          }
          if (s.favoriteDriverIds.length >= MAX_FAVORITE_DRIVERS) return s;
          return { favoriteDriverIds: [...s.favoriteDriverIds, driverId] };
        }),
      setFavoriteDrivers: (ids) =>
        set({ favoriteDriverIds: ids.slice(0, MAX_FAVORITE_DRIVERS) }),

      // Welcome flow
      hasCompletedWelcome: false,
      completeWelcome: () => set({ hasCompletedWelcome: true }),
    }),
    { name: "f1-preferences" },
  ),
);
