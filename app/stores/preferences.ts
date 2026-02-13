import { create } from "zustand";
import { persist } from "zustand/middleware";

type SpeedUnit = "kph" | "mph";
type TempUnit = "C" | "F";

interface PreferencesState {
  speedUnit: SpeedUnit;
  tempUnit: TempUnit;
  setSpeedUnit: (unit: SpeedUnit) => void;
  setTempUnit: (unit: TempUnit) => void;
  toggleUnits: () => void;
  favoriteDriverNumber: number | null;
  setFavoriteDriver: (num: number | null) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      speedUnit: "mph",
      tempUnit: "F",
      setSpeedUnit: (unit) => set({ speedUnit: unit }),
      setTempUnit: (unit) => set({ tempUnit: unit }),
      toggleUnits: () =>
        set((s) => ({
          tempUnit: s.tempUnit === "C" ? "F" : "C",
          speedUnit: s.speedUnit === "kph" ? "mph" : "kph",
        })),
      favoriteDriverNumber: null,
      setFavoriteDriver: (num) => set({ favoriteDriverNumber: num }),
    }),
    { name: "f1-preferences" },
  ),
);
