import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// meetings — GP weekends
// ---------------------------------------------------------------------------
export const meetings = sqliteTable(
  "meetings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    key: integer("key").notNull().unique(), // F1 meeting key
    year: integer("year").notNull(),
    round: integer("round").notNull(),
    name: text("name").notNull(), // "Australian Grand Prix"
    officialName: text("official_name"),
    location: text("location"), // "Melbourne"
    country: text("country"),
    circuit: text("circuit"), // "Albert Park Grand Prix Circuit"
  },
  (table) => [
    index("meetings_year_idx").on(table.year),
  ],
);

// ---------------------------------------------------------------------------
// sessions — FP1, FP2, FP3, Qualifying, Sprint, Sprint Qualifying, Race
// ---------------------------------------------------------------------------
export const sessions = sqliteTable(
  "sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    key: integer("key").notNull().unique(), // F1 session key
    meetingKey: integer("meeting_key")
      .notNull()
      .references(() => meetings.key),
    type: text("type").notNull(), // "Race", "Qualifying", "Practice_1", etc.
    name: text("name").notNull(), // "Race", "Qualifying", "Practice 1"
    startDate: text("start_date"), // ISO datetime
    endDate: text("end_date"),
    gmtOffset: text("gmt_offset"),
    path: text("path").notNull(), // e.g. "2025/2025-03-14_Australian_Grand_Prix/2025-03-16_Race/"
    totalLaps: integer("total_laps"),
    ingestedAt: text("ingested_at"), // ISO datetime — null = not yet ingested
  },
  (table) => [
    index("sessions_meeting_key_idx").on(table.meetingKey),
    index("sessions_type_idx").on(table.type),
  ],
);

// ---------------------------------------------------------------------------
// sessionDrivers — driver roster + final results per session
// ---------------------------------------------------------------------------
export const sessionDrivers = sqliteTable(
  "session_drivers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionKey: integer("session_key")
      .notNull()
      .references(() => sessions.key),
    driverNumber: integer("driver_number").notNull(),
    abbreviation: text("abbreviation").notNull(), // "VER", "HAM"
    firstName: text("first_name"),
    lastName: text("last_name"),
    fullName: text("full_name"),
    teamName: text("team_name"),
    teamColor: text("team_color"), // hex without #
    headshotUrl: text("headshot_url"),
    countryCode: text("country_code"),
    // Results
    gridPosition: integer("grid_position"),
    finalPosition: integer("final_position"),
    status: text("status"), // "Finished", "DNF", "+1 Lap", etc.
    points: real("points"),
    // Best lap
    bestLapTime: text("best_lap_time"), // "1:22.167"
    bestLapTimeSeconds: real("best_lap_time_seconds"),
    bestLapNumber: integer("best_lap_number"),
    // Best sectors
    bestSector1: text("best_sector_1"),
    bestSector1Seconds: real("best_sector_1_seconds"),
    bestSector2: text("best_sector_2"),
    bestSector2Seconds: real("best_sector_2_seconds"),
    bestSector3: text("best_sector_3"),
    bestSector3Seconds: real("best_sector_3_seconds"),
    // Best speeds
    speedTrapBest: real("speed_trap_best"),
    sector1SpeedBest: real("sector1_speed_best"),
    sector2SpeedBest: real("sector2_speed_best"),
    finishLineSpeedBest: real("finish_line_speed_best"),
    // Pit info
    pitCount: integer("pit_count"),
  },
  (table) => [
    uniqueIndex("session_drivers_unique_idx").on(
      table.sessionKey,
      table.driverNumber,
    ),
    index("session_drivers_session_idx").on(table.sessionKey),
  ],
);

// ---------------------------------------------------------------------------
// laps — per driver per lap timing data
// ---------------------------------------------------------------------------
export const laps = sqliteTable(
  "laps",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionKey: integer("session_key")
      .notNull()
      .references(() => sessions.key),
    driverNumber: integer("driver_number").notNull(),
    lapNumber: integer("lap_number").notNull(),
    // Lap time
    lapTime: text("lap_time"), // "1:22.167"
    lapTimeSeconds: real("lap_time_seconds"),
    // Sectors
    sector1: text("sector_1"),
    sector1Seconds: real("sector_1_seconds"),
    sector2: text("sector_2"),
    sector2Seconds: real("sector_2_seconds"),
    sector3: text("sector_3"),
    sector3Seconds: real("sector_3_seconds"),
    // Speeds
    speedTrap: real("speed_trap"),
    sector1Speed: real("sector1_speed"),
    sector2Speed: real("sector2_speed"),
    finishLineSpeed: real("finish_line_speed"),
    // Position
    position: integer("position"),
    // Tire info
    compound: text("compound"), // "SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"
    tyreAge: integer("tyre_age"),
    // Flags
    isPit: integer("is_pit", { mode: "boolean" }),
    isOutLap: integer("is_out_lap", { mode: "boolean" }),
    isInLap: integer("is_in_lap", { mode: "boolean" }),
    isPersonalBest: integer("is_personal_best", { mode: "boolean" }),
  },
  (table) => [
    uniqueIndex("laps_unique_idx").on(
      table.sessionKey,
      table.driverNumber,
      table.lapNumber,
    ),
    index("laps_session_idx").on(table.sessionKey),
    index("laps_session_driver_idx").on(table.sessionKey, table.driverNumber),
  ],
);

// ---------------------------------------------------------------------------
// lapPositions — denormalized position per lap for fast lap chart queries
// ---------------------------------------------------------------------------
export const lapPositions = sqliteTable(
  "lap_positions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionKey: integer("session_key")
      .notNull()
      .references(() => sessions.key),
    driverNumber: integer("driver_number").notNull(),
    lapNumber: integer("lap_number").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("lap_positions_unique_idx").on(
      table.sessionKey,
      table.driverNumber,
      table.lapNumber,
    ),
    index("lap_positions_session_idx").on(table.sessionKey),
  ],
);

// ---------------------------------------------------------------------------
// stints — tire strategy per driver
// ---------------------------------------------------------------------------
export const stints = sqliteTable(
  "stints",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionKey: integer("session_key")
      .notNull()
      .references(() => sessions.key),
    driverNumber: integer("driver_number").notNull(),
    stintNumber: integer("stint_number").notNull(),
    compound: text("compound"), // "SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"
    isNew: integer("is_new", { mode: "boolean" }),
    tyresNotChanged: integer("tyres_not_changed", { mode: "boolean" }),
    totalLaps: integer("total_laps"),
    startLap: integer("start_lap"),
    endLap: integer("end_lap"),
  },
  (table) => [
    uniqueIndex("stints_unique_idx").on(
      table.sessionKey,
      table.driverNumber,
      table.stintNumber,
    ),
    index("stints_session_idx").on(table.sessionKey),
  ],
);

// ---------------------------------------------------------------------------
// pitStops — pit stop times
// ---------------------------------------------------------------------------
export const pitStops = sqliteTable(
  "pit_stops",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionKey: integer("session_key")
      .notNull()
      .references(() => sessions.key),
    driverNumber: integer("driver_number").notNull(),
    lapNumber: integer("lap_number").notNull(),
    stopNumber: integer("stop_number"),
    pitLaneTime: text("pit_lane_time"), // time in pit lane
    pitLaneTimeSeconds: real("pit_lane_time_seconds"),
    stationaryTime: text("stationary_time"), // time stationary
    stationaryTimeSeconds: real("stationary_time_seconds"),
  },
  (table) => [
    index("pit_stops_session_idx").on(table.sessionKey),
    index("pit_stops_session_driver_idx").on(
      table.sessionKey,
      table.driverNumber,
    ),
  ],
);

// ---------------------------------------------------------------------------
// raceControlMessages — flags, penalties, DRS, track limits
// ---------------------------------------------------------------------------
export const raceControlMessages = sqliteTable(
  "race_control_messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionKey: integer("session_key")
      .notNull()
      .references(() => sessions.key),
    utc: text("utc"), // ISO timestamp
    lapNumber: integer("lap_number"),
    category: text("category"), // "Flag", "SafetyCar", "Drs", "Other"
    flag: text("flag"), // "GREEN", "YELLOW", "RED", "CHEQUERED"
    scope: text("scope"), // "Track", "Sector", "Driver"
    sector: integer("sector"),
    driverNumber: integer("driver_number"),
    message: text("message").notNull(),
  },
  (table) => [
    index("race_control_session_idx").on(table.sessionKey),
    index("race_control_lap_idx").on(table.sessionKey, table.lapNumber),
  ],
);

// ---------------------------------------------------------------------------
// weatherSeries — weather data points (~every 60 seconds)
// ---------------------------------------------------------------------------
export const weatherSeries = sqliteTable(
  "weather_series",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionKey: integer("session_key")
      .notNull()
      .references(() => sessions.key),
    utc: text("utc"), // ISO timestamp
    airTemp: real("air_temp"),
    trackTemp: real("track_temp"),
    humidity: real("humidity"),
    pressure: real("pressure"),
    rainfall: integer("rainfall", { mode: "boolean" }),
    windDirection: integer("wind_direction"),
    windSpeed: real("wind_speed"),
  },
  (table) => [index("weather_session_idx").on(table.sessionKey)],
);

// ---------------------------------------------------------------------------
// sessionStatus — track status + session status timeline
// ---------------------------------------------------------------------------
export const sessionStatus = sqliteTable(
  "session_status",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionKey: integer("session_key")
      .notNull()
      .references(() => sessions.key),
    utc: text("utc"), // ISO timestamp
    type: text("type").notNull(), // "TrackStatus" or "SessionStatus"
    status: text("status").notNull(), // "1" (green), "2" (yellow), "4" (SC), "6" (VSC), "5" (red) for track; "Started", "Finished" for session
    message: text("message"), // human-readable
  },
  (table) => [index("session_status_session_idx").on(table.sessionKey)],
);
