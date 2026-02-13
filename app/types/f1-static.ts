// Raw JSON shapes from livetiming.formula1.com/static/

// ---------------------------------------------------------------------------
// Index.json — Season index
// ---------------------------------------------------------------------------
export interface RawSeasonIndex {
  Year: number;
  Meetings: RawMeeting[];
}

export interface RawMeeting {
  Key: number;
  Code: string;
  Number: number;
  Location: string;
  OfficialName: string;
  Name: string;
  Country: { Key: number; Code: string; Name: string };
  Circuit: { Key: number; ShortName: string };
  Sessions: RawSession[];
}

export interface RawSession {
  Key: number;
  Type: string; // "Practice", "Qualifying", "Race"
  Number?: number; // 1,2,3 for practice; -1 for sprint qualifying/sprint
  Name: string; // "Practice 1", "Qualifying", "Race", "Sprint", "Sprint Qualifying"
  StartDate: string;
  EndDate: string;
  GmtOffset: string;
  Path?: string;
}

// ---------------------------------------------------------------------------
// DriverList.json — keyed by racing number
// ---------------------------------------------------------------------------
export interface RawDriverList {
  [racingNumber: string]: RawDriver;
}

export interface RawDriver {
  RacingNumber: string;
  BroadcastName: string;
  FullName: string;
  Tla: string; // Three-letter abbreviation
  Line: number; // Final classification position
  TeamName: string;
  TeamColour: string; // hex without #
  FirstName: string;
  LastName: string;
  Reference: string;
  HeadshotUrl?: string;
  CountryCode?: string;
}

// ---------------------------------------------------------------------------
// TimingStats.json — best lap/sector/speed stats per driver
// ---------------------------------------------------------------------------
export interface RawTimingStats {
  Withheld: boolean;
  Lines: {
    [racingNumber: string]: RawTimingStatsDriver;
  };
}

export interface RawTimingStatsDriver {
  Line: number;
  RacingNumber: string;
  PersonalBestLapTime: {
    Lap?: number;
    Position?: number;
    Value: string;
  };
  BestSectors: Array<{
    Position?: number;
    Value: string;
  }>;
  BestSpeeds: {
    I1: { Position?: number; Value: string };
    I2: { Position?: number; Value: string };
    FL: { Position?: number; Value: string };
    ST: { Position?: number; Value: string };
  };
}

// ---------------------------------------------------------------------------
// TimingAppData.json — stints + grid position
// ---------------------------------------------------------------------------
export interface RawTimingAppData {
  Lines: {
    [racingNumber: string]: RawTimingAppDriver;
  };
}

export interface RawTimingAppDriver {
  RacingNumber: string;
  Line: number;
  GridPos: string;
  Stints: RawStint[];
}

export interface RawStint {
  LapTime?: string;
  LapNumber?: number;
  LapFlags: number;
  Compound: string;
  New: string; // "true" or "false"
  TyresNotChanged: string; // "0" or "1"
  TotalLaps: number;
  StartLaps: number;
}

// ---------------------------------------------------------------------------
// TimingDataF1.json — final timing data with positions, gaps, pit stops
// ---------------------------------------------------------------------------
export interface RawTimingDataF1 {
  Lines: {
    [racingNumber: string]: RawTimingDataDriver;
  };
}

export interface RawTimingDataDriver {
  GapToLeader: string;
  IntervalToPositionAhead: { Value: string; Catching: boolean };
  Line: number;
  Position: string;
  ShowPosition: boolean;
  RacingNumber: string;
  Retired: boolean;
  InPit: boolean;
  PitOut: boolean;
  Stopped: boolean;
  Status: number;
  NumberOfLaps: number;
  NumberOfPitStops: number;
  Sectors: Array<{
    Stopped: boolean;
    PreviousValue?: string;
    Value?: string;
    Status: number;
    OverallFastest: boolean;
    PersonalFastest: boolean;
    Segments: Array<{ Status: number }>;
  }>;
  Speeds: {
    I1: { Value: string; Status: number; OverallFastest: boolean; PersonalFastest: boolean };
    I2: { Value: string; Status: number; OverallFastest: boolean; PersonalFastest: boolean };
    FL: { Value: string; Status: number; OverallFastest: boolean; PersonalFastest: boolean };
    ST: { Value: string; Status: number; OverallFastest: boolean; PersonalFastest: boolean };
  };
  BestLapTime: { Value: string; Lap?: number };
  LastLapTime: { Value: string; Status: number; OverallFastest: boolean; PersonalFastest: boolean };
}

// ---------------------------------------------------------------------------
// LapSeries.json — position per lap per driver
// ---------------------------------------------------------------------------
export interface RawLapSeries {
  [racingNumber: string]: {
    RacingNumber: string;
    LapPosition: string[]; // position at each lap (1-indexed by array index)
  };
}

// ---------------------------------------------------------------------------
// PitStopSeries.json — pit stop times
// ---------------------------------------------------------------------------
export interface RawPitStopSeries {
  PitTimes: {
    [racingNumber: string]: Array<{
      Timestamp: string;
      PitStop: {
        RacingNumber: string;
        PitStopTime: string; // seconds, e.g. "2.5"
        PitLaneTime: string; // seconds, e.g. "19.649"
        Lap: string; // lap number as string
      };
    }>;
  };
}

// ---------------------------------------------------------------------------
// RaceControlMessages.json
// ---------------------------------------------------------------------------
export interface RawRaceControlMessages {
  Messages: RawRaceControlMessage[];
}

export interface RawRaceControlMessage {
  Utc: string;
  Lap: number;
  Category: string; // "Flag", "SafetyCar", "Drs", "Other"
  Flag?: string; // "GREEN", "YELLOW", "RED", "DOUBLE YELLOW", "CLEAR", "CHEQUERED"
  Status?: string; // for SafetyCar/Drs
  Mode?: string; // "SAFETY CAR", "VIRTUAL SAFETY CAR"
  Scope?: string; // "Track", "Sector", "Driver"
  Sector?: number;
  RacingNumber?: string;
  Message: string;
}

// ---------------------------------------------------------------------------
// WeatherDataSeries.json
// ---------------------------------------------------------------------------
export interface RawWeatherDataSeries {
  Series: Array<{
    Timestamp: string;
    Weather: {
      AirTemp: string;
      Humidity: string;
      Pressure: string;
      Rainfall: string; // "0" or "1"
      TrackTemp: string;
      WindDirection: string;
      WindSpeed: string;
    };
  }>;
}

// ---------------------------------------------------------------------------
// SessionData.json — lap timing series + status series
// ---------------------------------------------------------------------------
export interface RawSessionData {
  Series: Array<{
    Utc: string;
    Lap: number;
  }>;
  StatusSeries: Array<{
    Utc: string;
    TrackStatus?: string; // "AllClear", "Yellow", "SCDeployed", "Red", "VSCDeployed", "VSCEnding"
    SessionStatus?: string; // "Started", "Aborted", "Finished", "Finalised", "Ends"
  }>;
}

// ---------------------------------------------------------------------------
// LapCount.json
// ---------------------------------------------------------------------------
export interface RawLapCount {
  CurrentLap: number;
  TotalLaps: number;
}
