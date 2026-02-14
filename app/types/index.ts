export type {
  IncidentType,
  SessionType,
  PenaltyDecision,
  Incident,
  PenaltyData,
  DriverPenaltySummary,
  ConsistencyGroup,
} from "./penalties";

export type {
  DOTDCandidate,
  DOTDRace,
  DOTDSeason,
  DOTDDriverStats,
  DOTDHighlights,
} from "./dotd";

export type ContractStatus = "locked" | "expiring" | "open";

export interface Rumor {
  text: string;
  source: string;
  url: string;
  date: string;
}

export interface DriverSocials {
  twitter: string | null;
  instagram: string | null;
  youtube: string | null;
}

export interface Driver {
  id: string;
  name: string;
  number: number | null;
  nationality: string;
  contractStatus: ContractStatus;
  contractEnd: string | null;
  headshotUrl?: string;
  rumors: Rumor[];
  socials?: DriverSocials;
}

export interface ReserveDriver {
  name: string;
  nationality: string;
  role: "reserve" | "test" | "development" | "academy";
  series?: string;
  sharedWith?: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  logoUrl?: string;
  constructorId?: string;
  twitter?: string | null;
  instagram?: string | null;
  website?: string | null;
  reserveDrivers?: ReserveDriver[];
  seat1: Driver;
  seat2: Driver;
}

export interface GridData {
  season: number;
  lastUpdated: string;
  teams: Team[];
}

// Contract / salary types (Spotrac)

export interface SalaryYear {
  year: number;
  age: number;
  team: string;
  salary: number;
  isEstimate?: boolean;
}

export interface ContractTransaction {
  date: string;       // ISO date, e.g. "2024-07-29"
  description: string;
}

export interface DriverContract {
  id?: string;
  driver: string;
  number: number;
  team: string;
  contractThrough: number | null;
  dealType: string;
  estimatedSalary?: string;
  notes?: string;
  careerEarnings?: number;
  salaryHistory?: SalaryYear[];
  transactions?: ContractTransaction[];
}

// Constructor types (f1-constructors.json)

export interface Constructor {
  constructor: string;
  engine: string;
  licensedIn: string | string[];
  basedIn: string | string[];
  seasons: string;
  racesEntered: number;
  racesStarted: number;
  drivers: number;
  totalEntries: number;
  wins: number;
  points: number | null;
  poles: number;
  fastestLaps: number;
  podiums: number;
  wcc: number | null;
  wdc: number;
  antecedentTeams?: string[];
  note?: string;
}

export interface ConstructorsData {
  current: Constructor[];
  former: Constructor[];
}

// Schedule types (Jolpica API)

export interface CircuitLocation {
  lat: string;
  long: string;
  locality: string;
  country: string;
}

export interface Circuit {
  circuitId: string;
  url: string;
  circuitName: string;
  Location: CircuitLocation;
}

export interface SessionTime {
  date: string;
  time: string;
}

export interface Race {
  season: string;
  round: string;
  url: string;
  raceName: string;
  Circuit: Circuit;
  date: string;
  time: string;
  FirstPractice?: SessionTime;
  SecondPractice?: SessionTime;
  ThirdPractice?: SessionTime;
  Qualifying?: SessionTime;
  Sprint?: SessionTime;
  SprintQualifying?: SessionTime;
}

export interface JolpicaResponse {
  MRData: {
    xmlns: string;
    series: string;
    url: string;
    limit: string;
    offset: string;
    total: string;
    RaceTable: {
      season: string;
      Races: Race[];
    };
  };
}
