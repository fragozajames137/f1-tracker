import { create } from "zustand";
import { persist } from "zustand/middleware";

type SpeedUnit = "kph" | "mph";

interface PreferencesState {
  speedUnit: SpeedUnit;
  setSpeedUnit: (unit: SpeedUnit) => void;
  favoriteDriverNumber: number | null;
  setFavoriteDriver: (num: number | null) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      speedUnit: "kph",
      setSpeedUnit: (unit) => set({ speedUnit: unit }),
      favoriteDriverNumber: null,
      setFavoriteDriver: (num) => set({ favoriteDriverNumber: num }),
    }),
    { name: "f1-preferences" },
  ),
);
