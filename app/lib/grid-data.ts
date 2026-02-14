import gridData from "@/app/data/grid-2026.json";
import contractsData from "@/app/data/driver-contracts-2026.json";
import constructorsData from "@/app/data/f1-constructors.json";
import historicalDriversData from "@/app/data/f1-drivers.json";
import driverNumbersData from "@/app/data/driver-numbers.json";
import engineManufacturersData from "@/app/data/engine-manufacturers.json";
import type {
  GridData,
  Team,
  Driver,
  DriverContract,
  Constructor,
  ConstructorsData,
} from "@/app/types";
import type {
  F1HistoricalDriver,
  DriverNumberEntry,
  DriverNumbersData,
  EngineManufacturer,
} from "@/app/types/f1-reference";

const grid = gridData as GridData;
const contracts = contractsData as DriverContract[];
const constructors = constructorsData as ConstructorsData;
const historicalDrivers = historicalDriversData as F1HistoricalDriver[];
const driverNumbers = driverNumbersData as DriverNumbersData;
const engineManufacturers = engineManufacturersData as EngineManufacturer[];

// Pre-built indexes for fast lookups
const historicalDriverIndex = new Map<string, F1HistoricalDriver>(
  historicalDrivers.map((d) => [d.name.toLowerCase(), d]),
);

const driverNumberIndex = new Map<number, DriverNumberEntry>(
  driverNumbers.permanent.map((e) => [e.number, e]),
);

const engineIndex = new Map<string, EngineManufacturer>(
  engineManufacturers.map((e) => [e.manufacturer.toLowerCase(), e]),
);

// ---------------------------------------------------------------------------
// Driver lookups
// ---------------------------------------------------------------------------

export function getDriverById(id: string): { driver: Driver; team: Team } | null {
  for (const team of grid.teams) {
    if (team.seat1.id === id) return { driver: team.seat1, team };
    if (team.seat2.id === id) return { driver: team.seat2, team };
  }
  return null;
}

export function getAllDriverIds(): string[] {
  return grid.teams.flatMap((t) => [t.seat1.id, t.seat2.id]);
}

// ---------------------------------------------------------------------------
// Team lookups
// ---------------------------------------------------------------------------

export function getTeamById(id: string): Team | null {
  return grid.teams.find((t) => t.id === id) ?? null;
}

export function getAllTeamIds(): string[] {
  return grid.teams.map((t) => t.id);
}

// ---------------------------------------------------------------------------
// Contract lookups
// ---------------------------------------------------------------------------

export function getContractByDriverId(id: string): DriverContract | null {
  return contracts.find((c) => c.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Constructor lookups
// ---------------------------------------------------------------------------

export function getConstructorByTeamId(teamId: string): Constructor | null {
  const team = getTeamById(teamId);
  if (!team?.constructorId) return null;
  return (
    constructors.current.find((c) => c.constructor === team.constructorId) ??
    constructors.former.find((c) => c.constructor === team.constructorId) ??
    null
  );
}

// ---------------------------------------------------------------------------
// Grid data
// ---------------------------------------------------------------------------

export function getGrid(): GridData {
  return grid;
}

// ---------------------------------------------------------------------------
// Historical driver lookups (f1-drivers.json)
// ---------------------------------------------------------------------------

export function getHistoricalDriver(name: string): F1HistoricalDriver | null {
  return historicalDriverIndex.get(name.toLowerCase()) ?? null;
}

// ---------------------------------------------------------------------------
// Driver number lookups (driver-numbers.json)
// ---------------------------------------------------------------------------

export function getDriverNumberEntry(number: number): DriverNumberEntry | null {
  return driverNumberIndex.get(number) ?? null;
}

export interface DriverNumberUsage {
  number: number;
  firstUsed: number;
  lastUsed: number | "active";
  asChampion?: boolean;
  note?: string;
}

export function getDriverNumberHistory(driverName: string): DriverNumberUsage[] {
  const nameLower = driverName.toLowerCase();
  const usages: DriverNumberUsage[] = [];

  for (const entry of driverNumbers.permanent) {
    for (const holder of entry.holders) {
      if (holder.driver.toLowerCase() === nameLower) {
        usages.push({
          number: entry.number,
          firstUsed: holder.firstUsed,
          lastUsed: holder.lastUsed,
          asChampion: holder.asChampion,
          note: holder.note,
        });
      }
    }
  }

  // Sort by firstUsed ascending
  usages.sort((a, b) => a.firstUsed - b.firstUsed);
  return usages;
}

// ---------------------------------------------------------------------------
// Engine manufacturer lookups (engine-manufacturers.json)
// ---------------------------------------------------------------------------

export function getEngineManufacturer(engineName: string): EngineManufacturer | null {
  return engineIndex.get(engineName.toLowerCase()) ?? null;
}
