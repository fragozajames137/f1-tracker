// Types for static F1 reference JSON data files in app/data/

// gp-circuits.json
export interface GpCircuitRace {
  title: string;
  yearsHeld: string;
  count?: number;
  note?: string;
}

export interface GpCircuit {
  circuit: string;
  location?: string;
  country: string;
  races: GpCircuitRace[];
  totalRaces: number;
  contractedUntil: number | null;
  onCalendar2026?: boolean;
  startsFrom?: number;
}

// gp-contracts-2026.json
export interface GpContract {
  grandPrix: string;
  country: string;
  circuit: string;
  location: string;
  contractEnds: number;
  startsFrom?: number;
}

// gp-host-nations.json
export interface GpHostNationRace {
  title: string;
  yearsHeld: string;
  count?: number;
  note?: string;
}

export interface GpHostNation {
  country: string;
  races: GpHostNationRace[];
  totalRaces: number;
  circuitsUsed: number;
  onCalendar2026: boolean;
  startsFrom?: number;
}

// f1-drivers.json
export interface F1HistoricalDriver {
  name: string;
  nationality: string;
  seasons: string;
  championships: number;
  entries: number;
  starts: number;
  poles: number;
  wins: number;
  podiums: number;
  fastestLaps: number;
  points: number;
}

// driver-numbers.json
export interface DriverNumberHolder {
  driver: string;
  nationality: string;
  team2026: string | null;
  firstUsed: number;
  lastUsed: number | "active";
  asChampion?: boolean;
  note?: string;
}

export interface DriverNumberEntry {
  number: number;
  status?: string;
  note?: string;
  holders: DriverNumberHolder[];
}

export interface DriverNumbersData {
  permanent: DriverNumberEntry[];
}

// engine-manufacturers.json
export interface EngineManufacturer {
  manufacturer: string;
  country: string;
  seasons: string;
  racesEntered: number | null;
  racesStarted: number | null;
  wins: number;
  points: number | null;
  poles: number;
  fastestLaps: number;
  podiums: number;
  wcc: number | null;
  wdc: number;
  active?: boolean;
  note?: string;
}

// f1-drivers-by-country.json
export interface CountryDriverStats {
  country: string;
  totalDrivers: number;
  champions: number;
  championships: number;
  raceWins: number;
  firstDriver: string;
  onCalendar2026: boolean;
  currentDrivers?: string[];
}

// gp-race-titles.json
export interface GpRaceTitle {
  raceTitle: string;
  country: string;
  countries?: string[];
  yearsHeld: string;
  circuitsUsed: number;
  totalRaces: number;
  onCalendar2026: boolean;
  note?: string;
}
