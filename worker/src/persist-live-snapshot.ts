import { createClient, type Client, type InStatement, type InValue } from "@libsql/client";
import { log, logError } from "./utils.js";
import type {
  OpenF1Driver,
  OpenF1Position,
  OpenF1Lap,
  OpenF1Pit,
  OpenF1Stint,
  OpenF1RaceControl,
  OpenF1Weather,
} from "./types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function secondsToLapTime(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toFixed(3).padStart(6, "0")}`;
  }
  return secs.toFixed(3);
}

async function batchInsert(
  client: Client,
  sql: string,
  rows: InValue[][],
  batchSize = 80,
): Promise<number> {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const statements: InStatement[] = chunk.map((args) => ({ sql, args }));
    await client.batch(statements, "write");
    inserted += chunk.length;
  }
  return inserted;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function persistLiveSnapshot(
  sessionKey: number,
): Promise<void> {
  log(`Persisting live snapshot for session ${sessionKey}...`);

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    // 1. Check if session already has archive-quality data
    const sessionResult = await client.execute({
      sql: "SELECT ingested_at, live_ingested_at FROM sessions WHERE key = ?",
      args: [sessionKey],
    });
    const sessionRow = sessionResult.rows[0];
    if (!sessionRow) {
      log(`Session ${sessionKey} not found in DB, skipping`);
      return;
    }
    if (sessionRow.ingested_at && !sessionRow.live_ingested_at) {
      log(`Session ${sessionKey} already has archive data, skipping live persist`);
      return;
    }

    // 2. Read all live_state topics
    const topicResult = await client.execute({
      sql: "SELECT topic, data FROM live_state WHERE session_key = ?",
      args: [sessionKey],
    });
    const topics = new Map<string, string>();
    for (const row of topicResult.rows) {
      topics.set(row.topic as string, row.data as string);
    }
    if (topics.size === 0) {
      log(`No live_state data for session ${sessionKey}`);
      return;
    }

    // 3. Parse JSON blobs
    const drivers: OpenF1Driver[] = JSON.parse(topics.get("drivers") ?? "[]");
    const positions: OpenF1Position[] = JSON.parse(topics.get("positions") ?? "[]");
    const laps: OpenF1Lap[] = JSON.parse(topics.get("laps") ?? "[]");
    const pitStops: OpenF1Pit[] = JSON.parse(topics.get("pit_stops") ?? "[]");
    const stints: OpenF1Stint[] = JSON.parse(topics.get("stints") ?? "[]");
    const raceControl: OpenF1RaceControl[] = JSON.parse(topics.get("race_control") ?? "[]");
    const weather: OpenF1Weather[] = JSON.parse(topics.get("weather") ?? "[]");
    const meta = JSON.parse(topics.get("meta") ?? "{}");

    // 4. Build lookup maps for cross-referencing
    const positionMap = new Map<number, number>(); // driverNumber → position
    for (const p of positions) {
      positionMap.set(p.driver_number, p.position);
    }

    const pitLapSet = new Set<string>(); // "driverNumber_lapNumber"
    const pitCountMap = new Map<number, number>(); // driverNumber → count
    for (const pit of pitStops) {
      pitLapSet.add(`${pit.driver_number}_${pit.lap_number}`);
      pitCountMap.set(pit.driver_number, (pitCountMap.get(pit.driver_number) ?? 0) + 1);
    }

    // Build stint lookup: find compound/tyreAge for a given driver+lap
    function findStint(driverNum: number, lapNum: number): OpenF1Stint | undefined {
      return stints.find(
        (s) =>
          s.driver_number === driverNum &&
          lapNum >= s.lap_start &&
          (s.lap_end === 0 || lapNum <= s.lap_end),
      );
    }

    // Build per-driver lap stats for session_drivers enrichment
    const driverLapStats = new Map<
      number,
      { bestTime: number; bestLapNum: number; bestS1: number; bestS2: number; bestS3: number; bestST: number }
    >();
    for (const lap of laps) {
      const existing = driverLapStats.get(lap.driver_number);
      const time = lap.lap_duration ?? Infinity;
      const s1 = lap.duration_sector_1 ?? Infinity;
      const s2 = lap.duration_sector_2 ?? Infinity;
      const s3 = lap.duration_sector_3 ?? Infinity;
      const st = lap.st_speed ?? 0;

      if (!existing) {
        driverLapStats.set(lap.driver_number, {
          bestTime: time,
          bestLapNum: lap.lap_number,
          bestS1: s1,
          bestS2: s2,
          bestS3: s3,
          bestST: st,
        });
      } else {
        if (time < existing.bestTime) {
          existing.bestTime = time;
          existing.bestLapNum = lap.lap_number;
        }
        if (s1 < existing.bestS1) existing.bestS1 = s1;
        if (s2 < existing.bestS2) existing.bestS2 = s2;
        if (s3 < existing.bestS3) existing.bestS3 = s3;
        if (st > existing.bestST) existing.bestST = st;
      }
    }

    // 5. Insert into normalized tables

    // --- session_drivers ---
    if (drivers.length > 0) {
      const driverRows = drivers.map((d) => {
        const stats = driverLapStats.get(d.driver_number);
        const bestTime = stats && stats.bestTime < Infinity ? stats.bestTime : null;
        const bestS1 = stats && stats.bestS1 < Infinity ? stats.bestS1 : null;
        const bestS2 = stats && stats.bestS2 < Infinity ? stats.bestS2 : null;
        const bestS3 = stats && stats.bestS3 < Infinity ? stats.bestS3 : null;
        const bestST = stats && stats.bestST > 0 ? stats.bestST : null;

        return [
          sessionKey,
          d.driver_number,
          d.name_acronym,
          d.first_name,
          d.last_name,
          d.full_name,
          d.team_name,
          d.team_colour,
          d.headshot_url ?? null,
          d.country_code,
          null, // gridPosition — not reliably available from live
          positionMap.get(d.driver_number) ?? null, // finalPosition
          null, // status
          null, // points
          secondsToLapTime(bestTime),
          bestTime,
          stats?.bestLapNum ?? null,
          secondsToLapTime(bestS1),
          bestS1,
          secondsToLapTime(bestS2),
          bestS2,
          secondsToLapTime(bestS3),
          bestS3,
          bestST,
          null, // sector1SpeedBest
          null, // sector2SpeedBest
          null, // finishLineSpeedBest
          pitCountMap.get(d.driver_number) ?? 0,
        ];
      });

      const driverSQL = `INSERT OR IGNORE INTO session_drivers (
        session_key, driver_number, abbreviation, first_name, last_name, full_name,
        team_name, team_color, headshot_url, country_code,
        grid_position, final_position, status, points,
        best_lap_time, best_lap_time_seconds, best_lap_number,
        best_sector_1, best_sector_1_seconds, best_sector_2, best_sector_2_seconds,
        best_sector_3, best_sector_3_seconds, speed_trap_best,
        sector1_speed_best, sector2_speed_best, finish_line_speed_best, pit_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      await batchInsert(client, driverSQL, driverRows);
      log(`  ${driverRows.length} drivers`);
    }

    // --- laps ---
    if (laps.length > 0) {
      const lapRows = laps.map((lap) => {
        const stint = findStint(lap.driver_number, lap.lap_number);
        const compound = stint?.compound ?? null;
        const tyreAge = stint
          ? stint.tyre_age_at_start + (lap.lap_number - stint.lap_start)
          : null;
        const isPit = pitLapSet.has(`${lap.driver_number}_${lap.lap_number}`);

        return [
          sessionKey,
          lap.driver_number,
          lap.lap_number,
          secondsToLapTime(lap.lap_duration),
          lap.lap_duration,
          secondsToLapTime(lap.duration_sector_1),
          lap.duration_sector_1,
          secondsToLapTime(lap.duration_sector_2),
          lap.duration_sector_2,
          secondsToLapTime(lap.duration_sector_3),
          lap.duration_sector_3,
          lap.st_speed,
          null, // sector1Speed
          null, // sector2Speed
          null, // finishLineSpeed
          null, // position (per-lap not available from live)
          compound,
          tyreAge,
          isPit ? 1 : 0,
          lap.is_pit_out_lap ? 1 : 0,
          isPit ? 1 : 0, // isInLap (approximation: same lap as pit)
          0, // isPersonalBest — would need per-driver min tracking, skip for live
        ];
      });

      const lapSQL = `INSERT OR IGNORE INTO laps (
        session_key, driver_number, lap_number,
        lap_time, lap_time_seconds, sector_1, sector_1_seconds,
        sector_2, sector_2_seconds, sector_3, sector_3_seconds,
        speed_trap, sector1_speed, sector2_speed, finish_line_speed,
        position, compound, tyre_age,
        is_pit, is_out_lap, is_in_lap, is_personal_best
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      await batchInsert(client, lapSQL, lapRows);
      log(`  ${lapRows.length} laps`);
    }

    // --- lap_positions (final position per driver on their last lap) ---
    if (positions.length > 0 && laps.length > 0) {
      const maxLapPerDriver = new Map<number, number>();
      for (const lap of laps) {
        const current = maxLapPerDriver.get(lap.driver_number) ?? 0;
        if (lap.lap_number > current) {
          maxLapPerDriver.set(lap.driver_number, lap.lap_number);
        }
      }

      const lpRows: InValue[][] = [];
      for (const pos of positions) {
        const maxLap = maxLapPerDriver.get(pos.driver_number);
        if (maxLap) {
          lpRows.push([sessionKey, pos.driver_number, maxLap, pos.position]);
        }
      }

      if (lpRows.length > 0) {
        const lpSQL = `INSERT OR IGNORE INTO lap_positions (
          session_key, driver_number, lap_number, position
        ) VALUES (?, ?, ?, ?)`;
        await batchInsert(client, lpSQL, lpRows);
        log(`  ${lpRows.length} lap positions`);
      }
    }

    // --- stints ---
    if (stints.length > 0) {
      const stintRows = stints.map((s) => [
        sessionKey,
        s.driver_number,
        s.stint_number,
        s.compound,
        null, // isNew — not in OpenF1Stint
        null, // tyresNotChanged — not in OpenF1Stint
        s.lap_end > 0 ? s.lap_end - s.lap_start + 1 : null, // totalLaps
        s.lap_start,
        s.lap_end > 0 ? s.lap_end : null,
      ]);

      const stintSQL = `INSERT OR IGNORE INTO stints (
        session_key, driver_number, stint_number, compound,
        is_new, tyres_not_changed, total_laps, start_lap, end_lap
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      await batchInsert(client, stintSQL, stintRows);
      log(`  ${stintRows.length} stints`);
    }

    // --- pit_stops ---
    if (pitStops.length > 0) {
      // Sort by driver then lap to compute stopNumber
      const sorted = [...pitStops].sort(
        (a, b) => a.driver_number - b.driver_number || a.lap_number - b.lap_number,
      );
      const stopCounts = new Map<number, number>();
      const pitRows = sorted.map((pit) => {
        const count = (stopCounts.get(pit.driver_number) ?? 0) + 1;
        stopCounts.set(pit.driver_number, count);
        return [
          sessionKey,
          pit.driver_number,
          pit.lap_number,
          count, // stopNumber
          null, // pitLaneTime — not available from SignalR
          null, // pitLaneTimeSeconds
          null, // stationaryTime
          null, // stationaryTimeSeconds
        ];
      });

      const pitSQL = `INSERT OR IGNORE INTO pit_stops (
        session_key, driver_number, lap_number, stop_number,
        pit_lane_time, pit_lane_time_seconds,
        stationary_time, stationary_time_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

      await batchInsert(client, pitSQL, pitRows);
      log(`  ${pitRows.length} pit stops`);
    }

    // --- race_control_messages ---
    if (raceControl.length > 0) {
      const rcRows = raceControl.map((rc) => [
        sessionKey,
        rc.date,
        rc.lap_number ?? null,
        rc.category,
        rc.flag ?? null,
        rc.scope ?? null,
        null, // sector
        rc.driver_number ?? null,
        rc.message,
      ]);

      const rcSQL = `INSERT INTO race_control_messages (
        session_key, utc, lap_number, category, flag, scope, sector, driver_number, message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      await batchInsert(client, rcSQL, rcRows);
      log(`  ${rcRows.length} race control messages`);
    }

    // --- weather_series ---
    if (weather.length > 0) {
      const weatherRows = weather.map((w) => [
        sessionKey,
        w.date,
        w.air_temperature,
        w.track_temperature,
        w.humidity,
        w.pressure,
        w.rainfall ? 1 : 0,
        w.wind_direction,
        w.wind_speed,
      ]);

      const weatherSQL = `INSERT INTO weather_series (
        session_key, utc, air_temp, track_temp, humidity, pressure,
        rainfall, wind_direction, wind_speed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      await batchInsert(client, weatherSQL, weatherRows);
      log(`  ${weatherRows.length} weather entries`);
    }

    // 6. Mark session as live-ingested
    const now = new Date().toISOString();
    await client.execute({
      sql: `UPDATE sessions SET ingested_at = ?, live_ingested_at = ?, total_laps = ?
            WHERE key = ? AND (ingested_at IS NULL OR live_ingested_at IS NOT NULL)`,
      args: [now, now, meta?.lap_count?.totalLaps ?? null, sessionKey],
    });

    log(`Live snapshot persisted for session ${sessionKey}`);
  } catch (err) {
    logError(`Failed to persist live snapshot for session ${sessionKey}:`, err);
  } finally {
    client.close();
  }
}
