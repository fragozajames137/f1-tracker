import type {
  RawMeeting,
  RawSession,
  RawDriverList,
  RawTimingStats,
  RawTimingAppData,
  RawTimingDataF1,
  RawLapSeries,
  RawPitStopSeries,
  RawRaceControlMessages,
  RawWeatherDataSeries,
  RawSessionData,
  RawLapCount,
} from "../../app/types/f1-static";

// ---------------------------------------------------------------------------
// Time parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parse a lap/sector time string to seconds.
 * Handles "1:22.167" → 82.167, "28.766" → 28.766, "" → null
 */
export function parseTimeToSeconds(value: string | undefined | null): number | null {
  if (!value || value.trim() === "") return null;
  const trimmed = value.trim();

  // "M:SS.mmm" format
  const colonMatch = trimmed.match(/^(\d+):(\d+\.\d+)$/);
  if (colonMatch) {
    return parseInt(colonMatch[1], 10) * 60 + parseFloat(colonMatch[2]);
  }

  // "SS.mmm" format
  const secMatch = trimmed.match(/^(\d+\.\d+)$/);
  if (secMatch) {
    return parseFloat(secMatch[1]);
  }

  return null;
}

/**
 * Parse a numeric string to float, returning null for empty/invalid.
 */
function parseFloatSafe(value: string | undefined | null): number | null {
  if (!value || value.trim() === "") return null;
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

/**
 * Parse a numeric string to int, returning null for empty/invalid.
 */
function parseIntSafe(value: string | undefined | null): number | null {
  if (!value || value.trim() === "") return null;
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}

// ---------------------------------------------------------------------------
// Meeting
// ---------------------------------------------------------------------------
export interface ParsedMeeting {
  key: number;
  year: number;
  round: number;
  name: string;
  officialName: string | null;
  location: string | null;
  country: string | null;
  circuit: string | null;
}

export function parseMeeting(raw: RawMeeting, year: number): ParsedMeeting {
  return {
    key: raw.Key,
    year,
    round: raw.Number,
    name: raw.Name,
    officialName: raw.OfficialName || null,
    location: raw.Location || null,
    country: raw.Country?.Name || null,
    circuit: raw.Circuit?.ShortName || null,
  };
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------
export interface ParsedSession {
  key: number;
  meetingKey: number;
  type: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  gmtOffset: string | null;
  path: string;
  totalLaps: number | null;
  ingestedAt: string | null;
}

export function parseSession(
  raw: RawSession,
  meetingKey: number,
): ParsedSession {
  // Normalize type: "Practice" → "Practice_1", etc.
  let type = raw.Type;
  if (raw.Type === "Practice" && raw.Number && raw.Number > 0) {
    type = `Practice_${raw.Number}`;
  } else if (raw.Type === "Qualifying" && raw.Number === -1) {
    type = "Sprint_Qualifying";
  } else if (raw.Type === "Race" && raw.Number === -1) {
    type = "Sprint";
  }

  return {
    key: raw.Key,
    meetingKey,
    type,
    name: raw.Name,
    startDate: raw.StartDate || null,
    endDate: raw.EndDate || null,
    gmtOffset: raw.GmtOffset || null,
    path: raw.Path || "",
    totalLaps: null,
    ingestedAt: null,
  };
}

// ---------------------------------------------------------------------------
// Session Drivers (merged from DriverList + TimingStats + TimingDataF1 + TimingAppData)
// ---------------------------------------------------------------------------
export interface ParsedSessionDriver {
  sessionKey: number;
  driverNumber: number;
  abbreviation: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  teamName: string | null;
  teamColor: string | null;
  headshotUrl: string | null;
  countryCode: string | null;
  gridPosition: number | null;
  finalPosition: number | null;
  status: string | null;
  points: number | null;
  bestLapTime: string | null;
  bestLapTimeSeconds: number | null;
  bestLapNumber: number | null;
  bestSector1: string | null;
  bestSector1Seconds: number | null;
  bestSector2: string | null;
  bestSector2Seconds: number | null;
  bestSector3: string | null;
  bestSector3Seconds: number | null;
  speedTrapBest: number | null;
  sector1SpeedBest: number | null;
  sector2SpeedBest: number | null;
  finishLineSpeedBest: number | null;
  pitCount: number | null;
}

export function parseSessionDrivers(
  sessionKey: number,
  driverList: RawDriverList,
  timingStats: RawTimingStats | null,
  timingData: RawTimingDataF1 | null,
  timingAppData: RawTimingAppData | null,
): ParsedSessionDriver[] {
  const drivers: ParsedSessionDriver[] = [];

  for (const [numStr, drv] of Object.entries(driverList)) {
    const driverNumber = parseInt(numStr, 10);
    const stats = timingStats?.Lines?.[numStr];
    const td = timingData?.Lines?.[numStr];
    const app = timingAppData?.Lines?.[numStr];

    // Determine final position: TimingDataF1 Position is most reliable
    let finalPosition: number | null = null;
    if (td?.Position) {
      finalPosition = parseIntSafe(td.Position);
    } else if (drv.Line) {
      finalPosition = drv.Line;
    }

    // Determine status
    let status: string | null = null;
    if (td) {
      if (td.Retired) status = "DNF";
      else if (td.Stopped) status = "Stopped";
      else status = "Finished";
    }

    drivers.push({
      sessionKey,
      driverNumber,
      abbreviation: drv.Tla,
      firstName: drv.FirstName || null,
      lastName: drv.LastName || null,
      fullName: drv.FullName || null,
      teamName: drv.TeamName || null,
      teamColor: drv.TeamColour || null,
      headshotUrl: drv.HeadshotUrl || null,
      countryCode: drv.CountryCode || null,
      gridPosition: parseIntSafe(app?.GridPos),
      finalPosition,
      status,
      points: null, // Not available in static API
      bestLapTime: stats?.PersonalBestLapTime?.Value || null,
      bestLapTimeSeconds: parseTimeToSeconds(
        stats?.PersonalBestLapTime?.Value,
      ),
      bestLapNumber: stats?.PersonalBestLapTime?.Lap ?? null,
      bestSector1: stats?.BestSectors?.[0]?.Value || null,
      bestSector1Seconds: parseTimeToSeconds(stats?.BestSectors?.[0]?.Value),
      bestSector2: stats?.BestSectors?.[1]?.Value || null,
      bestSector2Seconds: parseTimeToSeconds(stats?.BestSectors?.[1]?.Value),
      bestSector3: stats?.BestSectors?.[2]?.Value || null,
      bestSector3Seconds: parseTimeToSeconds(stats?.BestSectors?.[2]?.Value),
      speedTrapBest: parseFloatSafe(stats?.BestSpeeds?.ST?.Value),
      sector1SpeedBest: parseFloatSafe(stats?.BestSpeeds?.I1?.Value),
      sector2SpeedBest: parseFloatSafe(stats?.BestSpeeds?.I2?.Value),
      finishLineSpeedBest: parseFloatSafe(stats?.BestSpeeds?.FL?.Value),
      pitCount: td?.NumberOfPitStops ?? null,
    });
  }

  return drivers;
}

// ---------------------------------------------------------------------------
// Stints
// ---------------------------------------------------------------------------
export interface ParsedStint {
  sessionKey: number;
  driverNumber: number;
  stintNumber: number;
  compound: string | null;
  isNew: boolean | null;
  tyresNotChanged: boolean | null;
  totalLaps: number | null;
  startLap: number | null;
  endLap: number | null;
}

export function parseStints(
  sessionKey: number,
  timingAppData: RawTimingAppData,
): ParsedStint[] {
  const stints: ParsedStint[] = [];

  for (const [numStr, driver] of Object.entries(timingAppData.Lines)) {
    const driverNumber = parseInt(numStr, 10);
    if (!driver.Stints) continue;

    for (let i = 0; i < driver.Stints.length; i++) {
      const raw = driver.Stints[i];
      // Calculate start/end lap from cumulative data
      const previousTotalLaps = i > 0
        ? driver.Stints.slice(0, i).reduce((sum, s) => sum + (s.TotalLaps || 0), 0)
        : 0;
      const startLap = previousTotalLaps + 1;
      const endLap = previousTotalLaps + (raw.TotalLaps || 0);

      stints.push({
        sessionKey,
        driverNumber,
        stintNumber: i + 1,
        compound: raw.Compound || null,
        isNew: raw.New === "true",
        tyresNotChanged: raw.TyresNotChanged === "1",
        totalLaps: raw.TotalLaps ?? null,
        startLap: startLap > 0 ? startLap : null,
        endLap: endLap > 0 ? endLap : null,
      });
    }
  }

  return stints;
}

// ---------------------------------------------------------------------------
// Pit Stops
// ---------------------------------------------------------------------------
export interface ParsedPitStop {
  sessionKey: number;
  driverNumber: number;
  lapNumber: number;
  stopNumber: number | null;
  pitLaneTime: string | null;
  pitLaneTimeSeconds: number | null;
  stationaryTime: string | null;
  stationaryTimeSeconds: number | null;
}

export function parsePitStops(
  sessionKey: number,
  pitStopSeries: RawPitStopSeries,
): ParsedPitStop[] {
  const stops: ParsedPitStop[] = [];

  for (const [, driverStops] of Object.entries(pitStopSeries.PitTimes || {})) {
    for (let i = 0; i < driverStops.length; i++) {
      const raw = driverStops[i].PitStop;
      stops.push({
        sessionKey,
        driverNumber: parseInt(raw.RacingNumber, 10),
        lapNumber: parseInt(raw.Lap, 10),
        stopNumber: i + 1,
        pitLaneTime: raw.PitLaneTime || null,
        pitLaneTimeSeconds: parseFloatSafe(raw.PitLaneTime),
        stationaryTime: raw.PitStopTime || null,
        stationaryTimeSeconds: parseFloatSafe(raw.PitStopTime),
      });
    }
  }

  return stops;
}

// ---------------------------------------------------------------------------
// Race Control Messages
// ---------------------------------------------------------------------------
export interface ParsedRaceControlMessage {
  sessionKey: number;
  utc: string | null;
  lapNumber: number | null;
  category: string | null;
  flag: string | null;
  scope: string | null;
  sector: number | null;
  driverNumber: number | null;
  message: string;
}

export function parseRaceControlMessages(
  sessionKey: number,
  raw: RawRaceControlMessages,
): ParsedRaceControlMessage[] {
  return (raw.Messages || []).map((msg) => ({
    sessionKey,
    utc: msg.Utc || null,
    lapNumber: msg.Lap ?? null,
    category: msg.Category || null,
    flag: msg.Flag || null,
    scope: msg.Scope || null,
    sector: msg.Sector ?? null,
    driverNumber: msg.RacingNumber ? parseInt(msg.RacingNumber, 10) : null,
    message: msg.Message,
  }));
}

// ---------------------------------------------------------------------------
// Weather Series
// ---------------------------------------------------------------------------
export interface ParsedWeatherEntry {
  sessionKey: number;
  utc: string | null;
  airTemp: number | null;
  trackTemp: number | null;
  humidity: number | null;
  pressure: number | null;
  rainfall: boolean | null;
  windDirection: number | null;
  windSpeed: number | null;
}

export function parseWeatherSeries(
  sessionKey: number,
  raw: RawWeatherDataSeries,
): ParsedWeatherEntry[] {
  return (raw.Series || []).map((entry) => ({
    sessionKey,
    utc: entry.Timestamp || null,
    airTemp: parseFloatSafe(entry.Weather.AirTemp),
    trackTemp: parseFloatSafe(entry.Weather.TrackTemp),
    humidity: parseFloatSafe(entry.Weather.Humidity),
    pressure: parseFloatSafe(entry.Weather.Pressure),
    rainfall: entry.Weather.Rainfall === "1",
    windDirection: parseIntSafe(entry.Weather.WindDirection),
    windSpeed: parseFloatSafe(entry.Weather.WindSpeed),
  }));
}

// ---------------------------------------------------------------------------
// Lap Positions (from LapSeries.json)
// ---------------------------------------------------------------------------
export interface ParsedLapPosition {
  sessionKey: number;
  driverNumber: number;
  lapNumber: number;
  position: number;
}

export function parseLapSeries(
  sessionKey: number,
  raw: RawLapSeries,
): ParsedLapPosition[] {
  const positions: ParsedLapPosition[] = [];

  for (const [numStr, data] of Object.entries(raw)) {
    const driverNumber = parseInt(numStr, 10);
    if (!data.LapPosition) continue;

    for (let i = 0; i < data.LapPosition.length; i++) {
      const pos = parseInt(data.LapPosition[i], 10);
      if (isNaN(pos)) continue;
      positions.push({
        sessionKey,
        driverNumber,
        lapNumber: i + 1, // Array is 0-indexed but laps are 1-indexed
        position: pos,
      });
    }
  }

  return positions;
}

// ---------------------------------------------------------------------------
// Session Status (from SessionData.json StatusSeries)
// ---------------------------------------------------------------------------
export interface ParsedSessionStatus {
  sessionKey: number;
  utc: string | null;
  type: string;
  status: string;
  message: string | null;
}

export function parseSessionData(
  sessionKey: number,
  raw: RawSessionData,
): ParsedSessionStatus[] {
  return (raw.StatusSeries || []).map((entry) => {
    if (entry.TrackStatus) {
      return {
        sessionKey,
        utc: entry.Utc || null,
        type: "TrackStatus",
        status: entry.TrackStatus,
        message: entry.TrackStatus,
      };
    }
    return {
      sessionKey,
      utc: entry.Utc || null,
      type: "SessionStatus",
      status: entry.SessionStatus!,
      message: entry.SessionStatus!,
    };
  });
}

// ---------------------------------------------------------------------------
// Lap Count
// ---------------------------------------------------------------------------
export function parseLapCount(raw: RawLapCount | null): number | null {
  return raw?.TotalLaps ?? null;
}
