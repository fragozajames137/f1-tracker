export interface TelemetryDriver {
  number: number;
  abbreviation: string;
  fullName: string;
  teamName: string;
  teamColor: string | null;
  position: number | null;
  gridPosition: number | null;
  status: string;
}

export interface TelemetryLap {
  driverNumber: number;
  lapNumber: number;
  lapTime: number | null;
  sector1: number | null;
  sector2: number | null;
  sector3: number | null;
  compound: string | null;
  tyreLife: number | null;
  isPitOutLap: boolean;
  isPitInLap: boolean;
}

export interface TelemetrySpeedTrace {
  driverNumber: number;
  lapNumber: number;
  distance: number[];
  speed: number[];
  throttle: number[];
  brake: boolean[];
  drs?: boolean[];
  x?: number[];
  y?: number[];
}

export interface TrackBoundary {
  inner: { x: number[]; y: number[] };
  outer: { x: number[]; y: number[] };
}

export interface DrsZone {
  startDistance: number;
  endDistance: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface TelemetryStint {
  driverNumber: number;
  stintNumber: number;
  compound: string;
  lapStart: number;
  lapEnd: number;
}

export interface TelemetrySession {
  year: number;
  round: number;
  eventName: string;
  sessionType: string;
  circuitName: string;
  country: string;
  rotation?: number;
  trackBoundary?: TrackBoundary;
  drsZones?: DrsZone[];
  drivers: TelemetryDriver[];
  lapData: TelemetryLap[];
  telemetryData: TelemetrySpeedTrace[];
  stintData: TelemetryStint[];
}

export interface TelemetryFileInfo {
  filename: string;
  year: number;
  round: number;
  slug: string;
}
