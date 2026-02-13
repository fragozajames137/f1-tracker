// ---------------------------------------------------------------------------
// Raw SignalR message types from F1 Live Timing
// ---------------------------------------------------------------------------

/** Top-level response from SignalR — each key is a topic */
export interface SignalRFeed {
  TimingData?: TimingDataMessage;
  DriverList?: DriverListMessage;
  RaceControlMessages?: RaceControlMessagesMessage;
  WeatherData?: WeatherDataMessage;
  TeamRadio?: TeamRadioMessage;
  TimingAppData?: TimingAppDataMessage;
  SessionInfo?: SessionInfoMessage;
  LapCount?: LapCountMessage;
  TrackStatus?: TrackStatusMessage;
  Heartbeat?: HeartbeatMessage;
}

// ---------------------------------------------------------------------------
// TimingData
// ---------------------------------------------------------------------------

export interface TimingDataMessage {
  Lines?: Record<string, TimingDriverLine>;
}

export interface TimingDriverLine {
  RacingNumber?: string;
  Position?: string;
  GapToLeader?: string;
  IntervalToPositionAhead?: { Value?: string; Catching?: boolean };
  NumberOfLaps?: number;
  LastLapTime?: { Value?: string; PersonalFastest?: boolean; OverallFastest?: boolean };
  BestLapTime?: { Value?: string };
  Sectors?: Record<string, TimingSector>;
  Speeds?: {
    ST?: { Value?: string };
    I1?: { Value?: string };
    I2?: { Value?: string };
    FL?: { Value?: string };
  };
  InPit?: boolean;
  PitOut?: boolean;
  Retired?: boolean;
  Stopped?: boolean;
  KnockedOut?: boolean;
}

export interface TimingSector {
  Value?: string;
  PreviousValue?: string;
  Stopped?: boolean;
  PersonalFastest?: boolean;
  OverallFastest?: boolean;
}

// ---------------------------------------------------------------------------
// DriverList
// ---------------------------------------------------------------------------

export type DriverListMessage = Record<string, DriverListEntry>;

export interface DriverListEntry {
  RacingNumber?: string;
  BroadcastName?: string;
  FullName?: string;
  Tla?: string;
  TeamName?: string;
  TeamColour?: string;
  FirstName?: string;
  LastName?: string;
  HeadshotUrl?: string;
  CountryCode?: string;
  Line?: number;
}

// ---------------------------------------------------------------------------
// RaceControlMessages
// ---------------------------------------------------------------------------

export interface RaceControlMessagesMessage {
  Messages?: Record<string, RaceControlEntry>;
}

export interface RaceControlEntry {
  Utc?: string;
  Category?: string;
  Flag?: string;
  Message?: string;
  Scope?: string;
  RacingNumber?: string;
  Lap?: number;
  Sector?: number;
  Status?: string;
}

// ---------------------------------------------------------------------------
// WeatherData
// ---------------------------------------------------------------------------

export interface WeatherDataMessage {
  AirTemp?: string;
  TrackTemp?: string;
  Humidity?: string;
  Pressure?: string;
  Rainfall?: string;
  WindDirection?: string;
  WindSpeed?: string;
}

// ---------------------------------------------------------------------------
// TeamRadio
// ---------------------------------------------------------------------------

export interface TeamRadioMessage {
  Captures?: Record<string, TeamRadioCapture>;
}

export interface TeamRadioCapture {
  RacingNumber?: string;
  Utc?: string;
  Path?: string;
}

// ---------------------------------------------------------------------------
// TimingAppData (stints)
// ---------------------------------------------------------------------------

export interface TimingAppDataMessage {
  Lines?: Record<string, TimingAppDriverLine>;
}

export interface TimingAppDriverLine {
  Stints?: Record<string, TimingAppStint>;
  GridPos?: string;
}

export interface TimingAppStint {
  Compound?: string;
  New?: string;       // "true" | "false"
  TyresNotChanged?: string;
  TotalLaps?: number;
  StartLaps?: number;
  LapFlags?: number;
}

// ---------------------------------------------------------------------------
// SessionInfo
// ---------------------------------------------------------------------------

export interface SessionInfoMessage {
  Meeting?: {
    Key?: number;
    Name?: string;
    OfficialName?: string;
    Location?: string;
    Country?: { Key?: number; Code?: string; Name?: string };
    Circuit?: { Key?: number; ShortName?: string };
  };
  ArchiveStatus?: { Status?: string };
  Key?: number;
  Type?: string;
  Name?: string;
  StartDate?: string;
  EndDate?: string;
  GmtOffset?: string;
  Path?: string;
}

// ---------------------------------------------------------------------------
// LapCount
// ---------------------------------------------------------------------------

export interface LapCountMessage {
  CurrentLap?: number;
  TotalLaps?: number;
}

// ---------------------------------------------------------------------------
// TrackStatus
// ---------------------------------------------------------------------------

export interface TrackStatusMessage {
  Status?: string;
  Message?: string;
}

// ---------------------------------------------------------------------------
// Heartbeat
// ---------------------------------------------------------------------------

export interface HeartbeatMessage {
  Utc?: string;
}

// ---------------------------------------------------------------------------
// OpenF1 output types (duplicated from main app for worker independence)
// ---------------------------------------------------------------------------

export interface OpenF1Session {
  session_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
  gmt_offset: string;
  country_key: number;
  country_code: string;
  country_name: string;
  circuit_key: number;
  circuit_short_name: string;
  location: string;
  year: number;
}

export interface OpenF1Driver {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  first_name: string;
  last_name: string;
  headshot_url?: string;
  country_code: string;
  session_key: number;
}

export interface OpenF1Position {
  session_key: number;
  driver_number: number;
  position: number;
  date: string;
}

export interface OpenF1Lap {
  session_key: number;
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  is_pit_out_lap: boolean;
  st_speed: number | null;
  date_start: string;
}

export interface OpenF1Pit {
  session_key: number;
  driver_number: number;
  pit_duration: number | null;
  lap_number: number;
  date: string;
}

export interface OpenF1Interval {
  session_key: number;
  driver_number: number;
  gap_to_leader: number | null;
  interval: number | null;
  date: string;
}

export interface OpenF1RaceControl {
  session_key: number;
  date: string;
  category: string;
  flag?: string;
  message: string;
  scope?: string;
  driver_number?: number;
  lap_number?: number;
}

export interface OpenF1Weather {
  session_key: number;
  date: string;
  air_temperature: number;
  track_temperature: number;
  humidity: number;
  pressure: number;
  rainfall: number;
  wind_direction: number;
  wind_speed: number;
}

export interface OpenF1TeamRadio {
  session_key: number;
  driver_number: number;
  date: string;
  recording_url: string;
}

export interface OpenF1Stint {
  session_key: number;
  driver_number: number;
  stint_number: number;
  compound: string;
  tyre_age_at_start: number;
  lap_start: number;
  lap_end: number;
}
