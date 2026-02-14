export type IncidentType =
  | "causing-collision"
  | "forcing-off-track"
  | "impeding"
  | "track-limits"
  | "unsafe-release"
  | "speeding-pit-lane"
  | "false-start"
  | "dangerous-driving"
  | "safety-car-infringement"
  | "red-flag-infringement"
  | "pit-entry-infringement"
  | "technical-violation"
  | "change-of-direction";

export type SessionType =
  | "FP1"
  | "FP2"
  | "FP3"
  | "Qualifying"
  | "Sprint Qualifying"
  | "Sprint"
  | "Race"
  | "Pre-Race";

export interface PenaltyDecision {
  penaltyPoints: number;
  timePenalty: number | null;
  gridPenalty: number | null;
  driveThrough: boolean;
  reprimand: boolean;
  disqualified: boolean;
  fine: string | null;
  other: string | null;
}

export interface Incident {
  id: string;
  driverId: string;
  teamId: string;
  round: number;
  season: number;
  raceName: string;
  date: string;
  session: SessionType;
  incidentType: IncidentType;
  incidentDescription: string;
  decision: PenaltyDecision;
  document: string;
}

export interface PenaltyData {
  lastUpdated: string;
  incidents: Incident[];
}

export interface DriverPenaltySummary {
  driverId: string;
  driverName: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  nationality: string;
  activePoints: number;
  activeIncidents: Incident[];
  totalIncidents: number;
  nextExpiry: { date: string; points: number } | null;
  status: "clear" | "watch" | "warning" | "danger";
}

export interface ConsistencyGroup {
  incidentType: IncidentType;
  label: string;
  incidents: Incident[];
  count: number;
  avgPoints: number;
  minPoints: number;
  maxPoints: number;
  variance: number;
}
