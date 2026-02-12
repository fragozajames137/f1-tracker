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

export interface DriverWithDetails {
  driver: OpenF1Driver;
  position: OpenF1Position | null;
  interval: OpenF1Interval | null;
  lastLap: OpenF1Lap | null;
  currentStint: OpenF1Stint | null;
}

// Track Limits

export interface TrackLimitViolation {
  driver_number: number;
  lap_number: number | null;
  date: string;
  message: string;
}

export interface DriverTrackLimits {
  driver_number: number;
  name_acronym: string;
  team_colour: string;
  violations: TrackLimitViolation[];
  count: number;
  hasPenalty: boolean;
  predictedPositionDelta: number | null;
  predictedNewPosition: number | null;
}

// Championship Impact

export interface ProjectedDriverStanding {
  driverCode: string;
  driverName: string;
  teamName: string;
  teamColor: string;
  preRacePoints: number;
  projectedPoints: number;
  preRacePosition: number;
  projectedPosition: number;
  positionDelta: number;
  pointsDelta: number;
  currentRacePosition: number | null;
}

export interface ProjectedConstructorStanding {
  constructorName: string;
  constructorId: string;
  teamColor: string;
  preRacePoints: number;
  projectedPoints: number;
  preRacePosition: number;
  projectedPosition: number;
  positionDelta: number;
  pointsDelta: number;
}
