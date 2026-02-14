import { create } from "zustand";
import { persist } from "zustand/middleware";
import gridJson from "@/app/data/grid-2026.json";
import type { GridData } from "@/app/types";

const gridData = gridJson as GridData;

export interface PredictorDriver {
  id: string;
  name: string;
  nationality: string;
  isLocked: boolean;
  isCustom: boolean;
  pool: "grid" | "freeAgent" | "reserve" | "academy";
  headshotUrl?: string;
}

type SeatAssignment = Record<string, [string | null, string | null]>;

interface SharePayload {
  s: Record<string, [string | null, string | null]>;
  c: { n: string; t: string }[];
}

interface GridPredictorState {
  drivers: Record<string, PredictorDriver>;
  seats: SeatAssignment;
  customDriverCounter: number;
  isInitialized: boolean;

  initialize: () => void;
  placeDriver: (driverId: string, teamId: string, seatIndex: 0 | 1) => void;
  removeDriver: (driverId: string) => void;
  addCustomDriver: (name: string, nationality: string) => void;
  removeCustomDriver: (driverId: string) => void;
  reset: () => void;
  hydrateFromUrl: (encoded: string) => void;
  encodeGridState: () => string;
}

function isLockedFor2027(contractStatus: string, contractEnd: string | null): boolean {
  if (contractStatus !== "locked" || !contractEnd) return false;
  return parseInt(contractEnd) >= 2027;
}

function makeReserveId(name: string): string {
  return "reserve-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
}

function buildInitialState() {
  const drivers: Record<string, PredictorDriver> = {};
  const seats: SeatAssignment = {};
  const seenReserves = new Set<string>();

  for (const team of gridData.teams) {
    seats[team.id] = [null, null];

    for (const [idx, seatKey] of (["seat1", "seat2"] as const).entries()) {
      const driver = team[seatKey];
      const locked = isLockedFor2027(driver.contractStatus, driver.contractEnd);

      drivers[driver.id] = {
        id: driver.id,
        name: driver.name,
        nationality: driver.nationality,
        isLocked: locked,
        isCustom: false,
        pool: locked ? "grid" : "freeAgent",
        headshotUrl: driver.headshotUrl,
      };

      if (locked) {
        seats[team.id][idx] = driver.id;
      }
    }

    if (team.reserveDrivers) {
      for (const rd of team.reserveDrivers) {
        const rdId = makeReserveId(rd.name);
        if (seenReserves.has(rdId)) continue;
        seenReserves.add(rdId);

        drivers[rdId] = {
          id: rdId,
          name: rd.name,
          nationality: rd.nationality,
          isLocked: false,
          isCustom: false,
          pool: rd.role === "development" || rd.role === "academy" ? "academy" : "reserve",
        };
      }
    }
  }

  return { drivers, seats };
}

export const useGridPredictorStore = create<GridPredictorState>()(
  persist(
    (set, get) => ({
      drivers: {},
      seats: {},
      customDriverCounter: 0,
      isInitialized: false,

      initialize: () => {
        const state = get();
        if (state.isInitialized && Object.keys(state.drivers).length > 0) return;
        const { drivers, seats } = buildInitialState();
        set({ drivers, seats, isInitialized: true });
      },

      placeDriver: (driverId, teamId, seatIndex) => {
        const state = get();
        const driver = state.drivers[driverId];
        if (!driver || driver.isLocked) return;

        const newSeats = { ...state.seats };

        // Remove driver from any current seat
        for (const [tid, seatPair] of Object.entries(newSeats)) {
          const newPair: [string | null, string | null] = [...seatPair];
          for (let i = 0; i < 2; i++) {
            if (newPair[i] === driverId) {
              newPair[i] = null;
              newSeats[tid] = newPair;
            }
          }
        }

        // If target seat is occupied by a non-locked driver, displace them
        const targetPair: [string | null, string | null] = [...(newSeats[teamId] ?? [null, null])];
        const displacedId = targetPair[seatIndex];
        if (displacedId) {
          const displacedDriver = state.drivers[displacedId];
          if (displacedDriver?.isLocked) return;
        }

        targetPair[seatIndex] = driverId;
        newSeats[teamId] = targetPair;

        set({ seats: newSeats });
      },

      removeDriver: (driverId) => {
        const state = get();
        const driver = state.drivers[driverId];
        if (!driver || driver.isLocked) return;

        const newSeats = { ...state.seats };
        for (const [tid, seatPair] of Object.entries(newSeats)) {
          const newPair: [string | null, string | null] = [...seatPair];
          for (let i = 0; i < 2; i++) {
            if (newPair[i] === driverId) {
              newPair[i] = null;
              newSeats[tid] = newPair;
            }
          }
        }

        set({ seats: newSeats });
      },

      addCustomDriver: (name, nationality) => {
        const state = get();
        const counter = state.customDriverCounter + 1;
        const id = `custom-${counter}`;

        set({
          customDriverCounter: counter,
          drivers: {
            ...state.drivers,
            [id]: {
              id,
              name: name.trim(),
              nationality,
              isLocked: false,
              isCustom: true,
              pool: "freeAgent",
            },
          },
        });
      },

      removeCustomDriver: (driverId) => {
        const state = get();
        const driver = state.drivers[driverId];
        if (!driver?.isCustom) return;

        // Remove from seats if placed
        const newSeats = { ...state.seats };
        for (const [tid, seatPair] of Object.entries(newSeats)) {
          const newPair: [string | null, string | null] = [...seatPair];
          for (let i = 0; i < 2; i++) {
            if (newPair[i] === driverId) {
              newPair[i] = null;
              newSeats[tid] = newPair;
            }
          }
        }

        const newDrivers = { ...state.drivers };
        delete newDrivers[driverId];

        set({ drivers: newDrivers, seats: newSeats });
      },

      reset: () => {
        const { drivers, seats } = buildInitialState();
        set({ drivers, seats, customDriverCounter: 0 });
      },

      hydrateFromUrl: (encoded) => {
        try {
          const json = atob(encoded);
          const payload: SharePayload = JSON.parse(json);

          // Start from fresh initial state
          const { drivers, seats } = buildInitialState();
          let counter = 0;

          // Restore custom drivers
          if (payload.c) {
            for (const cd of payload.c) {
              counter++;
              const id = `custom-${counter}`;
              drivers[id] = {
                id,
                name: cd.n,
                nationality: cd.t,
                isLocked: false,
                isCustom: true,
                pool: "freeAgent",
              };
            }
          }

          // Restore seat assignments
          if (payload.s) {
            for (const [teamId, [s1, s2]] of Object.entries(payload.s)) {
              if (!seats[teamId]) continue;
              if (s1 && drivers[s1]) seats[teamId][0] = s1;
              if (s2 && drivers[s2]) seats[teamId][1] = s2;
            }
          }

          set({ drivers, seats, customDriverCounter: counter, isInitialized: true });
        } catch {
          // Invalid payload, silently ignore
        }
      },

      encodeGridState: () => {
        const state = get();
        const { seats: defaultSeats } = buildInitialState();

        // Only include non-default seat assignments
        const s: Record<string, [string | null, string | null]> = {};
        for (const [teamId, pair] of Object.entries(state.seats)) {
          const defaultPair = defaultSeats[teamId] ?? [null, null];
          if (pair[0] !== defaultPair[0] || pair[1] !== defaultPair[1]) {
            s[teamId] = pair;
          }
        }

        // Custom drivers
        const c = Object.values(state.drivers)
          .filter((d) => d.isCustom)
          .map((d) => ({ n: d.name, t: d.nationality }));

        const payload: SharePayload = { s, c };
        return btoa(JSON.stringify(payload));
      },
    }),
    {
      name: "f1-grid-predictor-2027",
      partialize: (state) => ({
        drivers: state.drivers,
        seats: state.seats,
        customDriverCounter: state.customDriverCounter,
        isInitialized: state.isInitialized,
      }),
    },
  ),
);
