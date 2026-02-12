export type ContractStatus = "locked" | "expiring" | "open";

export interface Rumor {
  text: string;
  source: string;
  url: string;
  date: string;
}

export interface Driver {
  id: string;
  name: string;
  number: number | null;
  nationality: string;
  contractStatus: ContractStatus;
  contractEnd: string | null;
  rumors: Rumor[];
}

export interface Team {
  id: string;
  name: string;
  color: string;
  logoUrl?: string;
  seat1: Driver;
  seat2: Driver;
}

export interface GridData {
  season: number;
  lastUpdated: string;
  teams: Team[];
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
