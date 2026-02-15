import { eq, and, asc, desc, sql, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import * as schema from "@/db/schema";

const CURRENT_YEAR = 2026;

export function getCacheControl(year?: number) {
  const isPast = year && year < CURRENT_YEAR;
  return isPast
    ? "public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400"
    : "public, max-age=300, s-maxage=3600, stale-while-revalidate=300";
}

export async function getSessionYear(sessionKey: number): Promise<number | null> {
  const db = getDb();
  const [row] = await db
    .select({ year: schema.meetings.year })
    .from(schema.sessions)
    .innerJoin(schema.meetings, eq(schema.sessions.meetingKey, schema.meetings.key))
    .where(eq(schema.sessions.key, sessionKey))
    .limit(1);
  return row?.year ?? null;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function getSessionsByYear(year: number, type?: string, round?: number) {
  const db = getDb();
  const conditions = [eq(schema.meetings.year, year)];
  if (type) {
    conditions.push(eq(schema.sessions.type, type));
  }
  if (round) {
    conditions.push(eq(schema.meetings.round, round));
  }

  return db
    .select({
      sessionKey: schema.sessions.key,
      sessionType: schema.sessions.type,
      sessionName: schema.sessions.name,
      startDate: schema.sessions.startDate,
      endDate: schema.sessions.endDate,
      gmtOffset: schema.sessions.gmtOffset,
      totalLaps: schema.sessions.totalLaps,
      ingestedAt: schema.sessions.ingestedAt,
      meetingKey: schema.meetings.key,
      meetingName: schema.meetings.name,
      round: schema.meetings.round,
      location: schema.meetings.location,
      country: schema.meetings.country,
      circuit: schema.meetings.circuit,
    })
    .from(schema.sessions)
    .innerJoin(schema.meetings, eq(schema.sessions.meetingKey, schema.meetings.key))
    .where(and(...conditions))
    .orderBy(asc(schema.meetings.round), asc(schema.sessions.startDate));
}

export async function getSessionDetail(sessionKey: number) {
  const db = getDb();
  const [session] = await db
    .select({
      sessionKey: schema.sessions.key,
      sessionType: schema.sessions.type,
      sessionName: schema.sessions.name,
      startDate: schema.sessions.startDate,
      endDate: schema.sessions.endDate,
      gmtOffset: schema.sessions.gmtOffset,
      totalLaps: schema.sessions.totalLaps,
      ingestedAt: schema.sessions.ingestedAt,
      meetingKey: schema.meetings.key,
      meetingName: schema.meetings.name,
      year: schema.meetings.year,
      round: schema.meetings.round,
      location: schema.meetings.location,
      country: schema.meetings.country,
      circuit: schema.meetings.circuit,
    })
    .from(schema.sessions)
    .innerJoin(schema.meetings, eq(schema.sessions.meetingKey, schema.meetings.key))
    .where(eq(schema.sessions.key, sessionKey))
    .limit(1);

  if (!session) return null;

  const drivers = await db
    .select()
    .from(schema.sessionDrivers)
    .where(eq(schema.sessionDrivers.sessionKey, sessionKey))
    .orderBy(asc(schema.sessionDrivers.finalPosition));

  const statusTimeline = await db
    .select()
    .from(schema.sessionStatus)
    .where(eq(schema.sessionStatus.sessionKey, sessionKey))
    .orderBy(asc(schema.sessionStatus.utc));

  return { ...session, drivers, statusTimeline };
}

// ---------------------------------------------------------------------------
// Laps
// ---------------------------------------------------------------------------

export async function getLaps(
  sessionKey: number,
  driverNumber?: number,
  fromLap?: number,
  toLap?: number,
) {
  const db = getDb();
  const conditions = [eq(schema.laps.sessionKey, sessionKey)];
  if (driverNumber) conditions.push(eq(schema.laps.driverNumber, driverNumber));
  if (fromLap) conditions.push(sql`${schema.laps.lapNumber} >= ${fromLap}`);
  if (toLap) conditions.push(sql`${schema.laps.lapNumber} <= ${toLap}`);

  return db
    .select()
    .from(schema.laps)
    .where(and(...conditions))
    .orderBy(asc(schema.laps.driverNumber), asc(schema.laps.lapNumber));
}

// ---------------------------------------------------------------------------
// Lap Chart (positions per lap for all drivers)
// ---------------------------------------------------------------------------

export async function getLapChart(sessionKey: number) {
  const db = getDb();
  const [positions, drivers] = await Promise.all([
    db
      .select()
      .from(schema.lapPositions)
      .where(eq(schema.lapPositions.sessionKey, sessionKey))
      .orderBy(asc(schema.lapPositions.lapNumber), asc(schema.lapPositions.position)),
    db
      .select({
        driverNumber: schema.sessionDrivers.driverNumber,
        abbreviation: schema.sessionDrivers.abbreviation,
        teamName: schema.sessionDrivers.teamName,
        teamColor: schema.sessionDrivers.teamColor,
      })
      .from(schema.sessionDrivers)
      .where(eq(schema.sessionDrivers.sessionKey, sessionKey)),
  ]);

  const driverMap = new Map(drivers.map((d) => [d.driverNumber, d]));

  // Group by lap number
  const laps = new Map<number, Array<{ driverNumber: number; position: number }>>();
  for (const pos of positions) {
    if (!laps.has(pos.lapNumber)) laps.set(pos.lapNumber, []);
    laps.get(pos.lapNumber)!.push({
      driverNumber: pos.driverNumber,
      position: pos.position,
    });
  }

  return {
    drivers: Object.fromEntries(driverMap),
    laps: Array.from(laps.entries())
      .sort(([a], [b]) => a - b)
      .map(([lap, positions]) => ({ lap, positions })),
  };
}

// ---------------------------------------------------------------------------
// Strategy (stints + pit stops)
// ---------------------------------------------------------------------------

export async function getStrategy(sessionKey: number) {
  const db = getDb();
  const [stintsData, pitStopsData, drivers] = await Promise.all([
    db
      .select()
      .from(schema.stints)
      .where(eq(schema.stints.sessionKey, sessionKey))
      .orderBy(asc(schema.stints.driverNumber), asc(schema.stints.stintNumber)),
    db
      .select()
      .from(schema.pitStops)
      .where(eq(schema.pitStops.sessionKey, sessionKey))
      .orderBy(asc(schema.pitStops.driverNumber), asc(schema.pitStops.lapNumber)),
    db
      .select({
        driverNumber: schema.sessionDrivers.driverNumber,
        abbreviation: schema.sessionDrivers.abbreviation,
        teamName: schema.sessionDrivers.teamName,
        teamColor: schema.sessionDrivers.teamColor,
        finalPosition: schema.sessionDrivers.finalPosition,
      })
      .from(schema.sessionDrivers)
      .where(eq(schema.sessionDrivers.sessionKey, sessionKey))
      .orderBy(asc(schema.sessionDrivers.finalPosition)),
  ]);

  return { drivers, stints: stintsData, pitStops: pitStopsData };
}

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

export async function getWeather(sessionKey: number) {
  const db = getDb();
  return db
    .select()
    .from(schema.weatherSeries)
    .where(eq(schema.weatherSeries.sessionKey, sessionKey))
    .orderBy(asc(schema.weatherSeries.utc));
}

// ---------------------------------------------------------------------------
// Race Control Messages
// ---------------------------------------------------------------------------

export async function getRaceControlMessages(sessionKey: number) {
  const db = getDb();
  return db
    .select()
    .from(schema.raceControlMessages)
    .where(eq(schema.raceControlMessages.sessionKey, sessionKey))
    .orderBy(asc(schema.raceControlMessages.utc));
}

// ---------------------------------------------------------------------------
// Speed Traps
// ---------------------------------------------------------------------------

export async function getSpeedTraps(sessionKey: number) {
  const db = getDb();
  return db
    .select({
      driverNumber: schema.sessionDrivers.driverNumber,
      abbreviation: schema.sessionDrivers.abbreviation,
      teamColor: schema.sessionDrivers.teamColor,
      speedTrapBest: schema.sessionDrivers.speedTrapBest,
      sector1SpeedBest: schema.sessionDrivers.sector1SpeedBest,
      sector2SpeedBest: schema.sessionDrivers.sector2SpeedBest,
      finishLineSpeedBest: schema.sessionDrivers.finishLineSpeedBest,
      finalPosition: schema.sessionDrivers.finalPosition,
    })
    .from(schema.sessionDrivers)
    .where(eq(schema.sessionDrivers.sessionKey, sessionKey))
    .orderBy(asc(schema.sessionDrivers.finalPosition));
}

// ---------------------------------------------------------------------------
// Pit Stops
// ---------------------------------------------------------------------------

export async function getPitStops(sessionKey: number) {
  const db = getDb();
  const [stops, drivers] = await Promise.all([
    db
      .select()
      .from(schema.pitStops)
      .where(eq(schema.pitStops.sessionKey, sessionKey))
      .orderBy(asc(schema.pitStops.lapNumber)),
    db
      .select({
        driverNumber: schema.sessionDrivers.driverNumber,
        abbreviation: schema.sessionDrivers.abbreviation,
        teamName: schema.sessionDrivers.teamName,
        teamColor: schema.sessionDrivers.teamColor,
      })
      .from(schema.sessionDrivers)
      .where(eq(schema.sessionDrivers.sessionKey, sessionKey)),
  ]);

  const driverMap = new Map(drivers.map((d) => [d.driverNumber, d]));

  return stops.map((stop) => ({
    ...stop,
    driver: driverMap.get(stop.driverNumber) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Driver Profile — years available in DB
// ---------------------------------------------------------------------------

export async function getDriverYears(fullName: string): Promise<number[]> {
  const db = getDb();
  const rows = await db
    .selectDistinct({ year: schema.meetings.year })
    .from(schema.sessionDrivers)
    .innerJoin(schema.sessions, eq(schema.sessionDrivers.sessionKey, schema.sessions.key))
    .innerJoin(schema.meetings, eq(schema.sessions.meetingKey, schema.meetings.key))
    .where(sql`LOWER(${schema.sessionDrivers.fullName}) = ${fullName.toLowerCase()}`)
    .orderBy(desc(schema.meetings.year));
  return rows.map((r) => r.year);
}

// ---------------------------------------------------------------------------
// Driver Profile — per-season summary stats (Race sessions only)
// ---------------------------------------------------------------------------

export async function getDriverSeasonStats(fullName: string) {
  const db = getDb();
  return db
    .select({
      year: schema.meetings.year,
      races: sql<number>`count(*)`,
      wins: sql<number>`sum(case when ${schema.sessionDrivers.finalPosition} = 1 then 1 else 0 end)`,
      podiums: sql<number>`sum(case when ${schema.sessionDrivers.finalPosition} <= 3 then 1 else 0 end)`,
      points: sql<number>`sum(coalesce(${schema.sessionDrivers.points}, 0))`,
      bestFinish: sql<number>`min(${schema.sessionDrivers.finalPosition})`,
      dnfs: sql<number>`sum(case when ${schema.sessionDrivers.status} like '%DNF%' or ${schema.sessionDrivers.status} like '%Retired%' then 1 else 0 end)`,
    })
    .from(schema.sessionDrivers)
    .innerJoin(schema.sessions, eq(schema.sessionDrivers.sessionKey, schema.sessions.key))
    .innerJoin(schema.meetings, eq(schema.sessions.meetingKey, schema.meetings.key))
    .where(
      and(
        sql`LOWER(${schema.sessionDrivers.fullName}) = ${fullName.toLowerCase()}`,
        eq(schema.sessions.type, "Race"),
      ),
    )
    .groupBy(schema.meetings.year)
    .orderBy(desc(schema.meetings.year));
}

// ---------------------------------------------------------------------------
// Driver Profile — race-by-race results for a given year
// ---------------------------------------------------------------------------

export async function getDriverRaceResults(fullName: string, year?: number) {
  const db = getDb();
  const conditions = [
    sql`LOWER(${schema.sessionDrivers.fullName}) = ${fullName.toLowerCase()}`,
    eq(schema.sessions.type, "Race"),
  ];
  if (year) conditions.push(eq(schema.meetings.year, year));

  return db
    .select({
      round: schema.meetings.round,
      raceName: schema.meetings.name,
      location: schema.meetings.location,
      country: schema.meetings.country,
      date: schema.sessions.startDate,
      gridPosition: schema.sessionDrivers.gridPosition,
      finalPosition: schema.sessionDrivers.finalPosition,
      status: schema.sessionDrivers.status,
      points: schema.sessionDrivers.points,
      bestLapTime: schema.sessionDrivers.bestLapTime,
      pitCount: schema.sessionDrivers.pitCount,
    })
    .from(schema.sessionDrivers)
    .innerJoin(schema.sessions, eq(schema.sessionDrivers.sessionKey, schema.sessions.key))
    .innerJoin(schema.meetings, eq(schema.sessions.meetingKey, schema.meetings.key))
    .where(and(...conditions))
    .orderBy(asc(schema.meetings.round));
}
