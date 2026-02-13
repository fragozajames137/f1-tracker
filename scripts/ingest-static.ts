import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { eq, and } from "drizzle-orm";
import * as schema from "../db/schema";
import { fetchSeasonIndex, fetchSessionFile } from "./lib/static-api";
import {
  parseMeeting,
  parseSession,
  parseSessionDrivers,
  parseStints,
  parsePitStops,
  parseRaceControlMessages,
  parseWeatherSeries,
  parseLapSeries,
  parseSessionData,
  parseLapCount,
} from "./lib/parsers";
import type {
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
} from "../app/types/f1-static";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const yearIdx = args.indexOf("--year");
const forceFlag = args.includes("--force");
const allFlag = args.includes("--all");

let years: number[] = [];
if (allFlag) {
  for (let y = 2018; y <= 2026; y++) years.push(y);
} else if (yearIdx !== -1 && args[yearIdx + 1]) {
  years = [parseInt(args[yearIdx + 1], 10)];
} else {
  console.log("Usage: npx tsx scripts/ingest-static.ts [--year 2025] [--all] [--force]");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// DB client (direct, not via Next.js env loading)
// ---------------------------------------------------------------------------
function getDb() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    console.error("Missing TURSO_DATABASE_URL environment variable");
    process.exit(1);
  }
  const client = createClient({ url, authToken });
  return drizzle(client, { schema });
}

const db = getDb();

// ---------------------------------------------------------------------------
// Batched insert helper — inserts in chunks of `batchSize`
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function batchInsert(
  table: Parameters<typeof db.insert>[0],
  rows: any[],
  batchSize = 500,
): Promise<void> {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    await db.insert(table).values(chunk);
  }
}

// ---------------------------------------------------------------------------
// Ingest a single session
// ---------------------------------------------------------------------------
async function ingestSession(
  sessionKey: number,
  sessionPath: string,
  sessionName: string,
): Promise<boolean> {
  // Check if already ingested
  if (!forceFlag) {
    const existing = await db
      .select({ ingestedAt: schema.sessions.ingestedAt })
      .from(schema.sessions)
      .where(eq(schema.sessions.key, sessionKey))
      .limit(1);
    if (existing[0]?.ingestedAt) {
      console.log(`    Skipping ${sessionName} (already ingested)`);
      return false;
    }
  }

  console.log(`    Ingesting ${sessionName}...`);

  // Fetch all session files in parallel
  const [
    driverList,
    timingStats,
    timingAppData,
    timingDataF1,
    lapSeries,
    pitStopSeries,
    raceControlMessages,
    weatherDataSeries,
    sessionData,
    lapCount,
  ] = await Promise.all([
    fetchSessionFile<RawDriverList>(sessionPath, "DriverList.json"),
    fetchSessionFile<RawTimingStats>(sessionPath, "TimingStats.json"),
    fetchSessionFile<RawTimingAppData>(sessionPath, "TimingAppData.json"),
    fetchSessionFile<RawTimingDataF1>(sessionPath, "TimingDataF1.json"),
    fetchSessionFile<RawLapSeries>(sessionPath, "LapSeries.json"),
    fetchSessionFile<RawPitStopSeries>(sessionPath, "PitStopSeries.json"),
    fetchSessionFile<RawRaceControlMessages>(sessionPath, "RaceControlMessages.json"),
    fetchSessionFile<RawWeatherDataSeries>(sessionPath, "WeatherDataSeries.json"),
    fetchSessionFile<RawSessionData>(sessionPath, "SessionData.json"),
    fetchSessionFile<RawLapCount>(sessionPath, "LapCount.json"),
  ]);

  // Skip sessions without driver data (incomplete)
  if (!driverList) {
    console.log(`    Skipping ${sessionName} (no DriverList — incomplete data)`);
    return false;
  }

  // Parse all data
  const parsedDrivers = parseSessionDrivers(
    sessionKey,
    driverList,
    timingStats,
    timingDataF1,
    timingAppData,
  );
  const parsedStints = timingAppData
    ? parseStints(sessionKey, timingAppData)
    : [];
  const parsedPitStops = pitStopSeries
    ? parsePitStops(sessionKey, pitStopSeries)
    : [];
  const parsedRCMessages = raceControlMessages
    ? parseRaceControlMessages(sessionKey, raceControlMessages)
    : [];
  const parsedWeather = weatherDataSeries
    ? parseWeatherSeries(sessionKey, weatherDataSeries)
    : [];
  const parsedLapPositions = lapSeries
    ? parseLapSeries(sessionKey, lapSeries)
    : [];
  const parsedStatus = sessionData
    ? parseSessionData(sessionKey, sessionData)
    : [];
  const totalLaps = parseLapCount(lapCount);

  // If --force, delete existing child rows first
  if (forceFlag) {
    await db.delete(schema.sessionDrivers).where(eq(schema.sessionDrivers.sessionKey, sessionKey));
    await db.delete(schema.laps).where(eq(schema.laps.sessionKey, sessionKey));
    await db.delete(schema.lapPositions).where(eq(schema.lapPositions.sessionKey, sessionKey));
    await db.delete(schema.stints).where(eq(schema.stints.sessionKey, sessionKey));
    await db.delete(schema.pitStops).where(eq(schema.pitStops.sessionKey, sessionKey));
    await db.delete(schema.raceControlMessages).where(eq(schema.raceControlMessages.sessionKey, sessionKey));
    await db.delete(schema.weatherSeries).where(eq(schema.weatherSeries.sessionKey, sessionKey));
    await db.delete(schema.sessionStatus).where(eq(schema.sessionStatus.sessionKey, sessionKey));
  }

  // Insert all data
  if (parsedDrivers.length > 0) {
    await batchInsert(schema.sessionDrivers, parsedDrivers);
    console.log(`      ${parsedDrivers.length} drivers`);
  }
  if (parsedStints.length > 0) {
    await batchInsert(schema.stints, parsedStints);
    console.log(`      ${parsedStints.length} stints`);
  }
  if (parsedPitStops.length > 0) {
    await batchInsert(schema.pitStops, parsedPitStops);
    console.log(`      ${parsedPitStops.length} pit stops`);
  }
  if (parsedRCMessages.length > 0) {
    await batchInsert(schema.raceControlMessages, parsedRCMessages);
    console.log(`      ${parsedRCMessages.length} race control messages`);
  }
  if (parsedWeather.length > 0) {
    await batchInsert(schema.weatherSeries, parsedWeather);
    console.log(`      ${parsedWeather.length} weather entries`);
  }
  if (parsedLapPositions.length > 0) {
    await batchInsert(schema.lapPositions, parsedLapPositions);
    console.log(`      ${parsedLapPositions.length} lap positions`);
  }
  if (parsedStatus.length > 0) {
    await batchInsert(schema.sessionStatus, parsedStatus);
    console.log(`      ${parsedStatus.length} status entries`);
  }

  // Update session with totalLaps + ingestedAt
  await db
    .update(schema.sessions)
    .set({
      totalLaps,
      ingestedAt: new Date().toISOString(),
    })
    .where(eq(schema.sessions.key, sessionKey));

  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`F1 Static API Ingestion Pipeline`);
  console.log(`Years: ${years.join(", ")} | Force: ${forceFlag}\n`);

  let totalSessions = 0;
  let ingestedSessions = 0;

  for (const year of years) {
    console.log(`\n=== ${year} Season ===`);
    const index = await fetchSeasonIndex(year);
    if (!index) {
      console.error(`  Failed to fetch season index for ${year}`);
      continue;
    }

    for (const rawMeeting of index.Meetings) {
      const meeting = parseMeeting(rawMeeting, year);
      console.log(`\n  ${meeting.name} (${meeting.location})`);

      // Upsert meeting
      const existingMeeting = await db
        .select({ id: schema.meetings.id })
        .from(schema.meetings)
        .where(eq(schema.meetings.key, meeting.key))
        .limit(1);

      if (existingMeeting.length === 0) {
        await db.insert(schema.meetings).values(meeting);
      } else {
        await db
          .update(schema.meetings)
          .set(meeting)
          .where(eq(schema.meetings.key, meeting.key));
      }

      // Process sessions
      for (const rawSession of rawMeeting.Sessions) {
        // Skip malformed sessions (e.g. key=-1, missing name)
        if (!rawSession.Name || rawSession.Key < 0) {
          console.log(`    Skipping malformed session (key=${rawSession.Key}, name=${rawSession.Name})`);
          continue;
        }

        const session = parseSession(rawSession, meeting.key);
        totalSessions++;

        // Upsert session
        const existingSession = await db
          .select({ id: schema.sessions.id })
          .from(schema.sessions)
          .where(eq(schema.sessions.key, session.key))
          .limit(1);

        if (existingSession.length === 0) {
          await db.insert(schema.sessions).values(session);
        } else if (forceFlag) {
          await db
            .update(schema.sessions)
            .set({
              meetingKey: session.meetingKey,
              type: session.type,
              name: session.name,
              startDate: session.startDate,
              endDate: session.endDate,
              gmtOffset: session.gmtOffset,
              path: session.path,
            })
            .where(eq(schema.sessions.key, session.key));
        }

        // Ingest session data (skip if no path — older seasons may lack it)
        if (!session.path) {
          console.log(`    Skipping ${meeting.name} - ${session.name} (no archive path)`);
          continue;
        }
        const didIngest = await ingestSession(
          session.key,
          session.path,
          `${meeting.name} - ${session.name}`,
        );
        if (didIngest) ingestedSessions++;
      }
    }
  }

  console.log(`\n\nDone! Ingested ${ingestedSessions}/${totalSessions} sessions.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
