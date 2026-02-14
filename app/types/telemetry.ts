export interface TelemetryDriver {
  number: number;
  abbreviation: string;
  fullName: string;
  teamName: string;
  teamColor: string | null;
  position: number | null;
  classifiedPosition: string | null;
  gridPosition: number | null;
  status: string;
  points: number | null;
  time: number | null;
  q1: number | null;
  q2: number | null;
  q3: number | null;
}

export interface TelemetryLap {
  driverNumber: number;
  lapNumber: number;
  lapTime: number | null;
  sector1: number | null;
  sector2: number | null;
  sector3: number | null;
  speedI1: number | null;
  speedI2: number | null;
  speedFL: number | null;
  speedST: number | null;
  compound: string | null;
  tyreLife: number | null;
  freshTyre: boolean | null;
  stint: number | null;
  position: number | null;
  trackStatus: string | null;
  isPersonalBest: boolean | null;
  isAccurate: boolean | null;
  deleted: boolean | null;
  deletedReason: string | null;
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
  rpm?: (number | null)[];
  gear?: (number | null)[];
  x?: number[];
  y?: number[];
  z?: (number | null)[];
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
  freshTyre: boolean | null;
  lapStart: number;
  lapEnd: number;
}

export interface TelemetryWeatherEntry {
  airTemp: number | null;
  trackTemp: number | null;
  humidity: number | null;
  pressure: number | null;
  rainfall: boolean | null;
  windDirection: number | null;
  windSpeed: number | null;
}

export interface TelemetryRaceControlMessage {
  lapNumber: number | null;
  category: string | null;
  flag: string | null;
  scope: string | null;
  sector: number | null;
  driverNumber: string | null;
  message: string;
}

export interface TelemetryTeamRadio {
  driverNumber: number;
  timestamp: string;       // ISO datetime
  audioFile: string;       // relative path: "radio/2025-R01/000_VER.mp3"
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
  weatherData?: TelemetryWeatherEntry[];
  raceControlMessages?: TelemetryRaceControlMessage[];
  teamRadioMessages?: TelemetryTeamRadio[];
}

export interface TelemetryFileInfo {
  filename: string;
  year: number;
  round: number;
  slug: string;
}
