import type { AccumulatedState } from "../state-manager.js";
import type { OpenF1Position, OpenF1Interval, OpenF1Lap, OpenF1Pit } from "../types.js";
import { parseLapTimeToSeconds, parseGapValue } from "../utils.js";

/**
 * Extract positions from accumulated TimingData.
 * One position entry per driver with their latest position.
 */
export function translatePositions(
  state: AccumulatedState,
  sessionKey: number,
): OpenF1Position[] {
  const lines = state.timingData.Lines;
  if (!lines) return [];

  const now = new Date().toISOString();
  const positions: OpenF1Position[] = [];

  for (const [driverNum, line] of Object.entries(lines)) {
    if (!line.Position) continue;
    positions.push({
      session_key: sessionKey,
      driver_number: parseInt(driverNum, 10),
      position: parseInt(line.Position, 10),
      date: now,
    });
  }

  return positions.sort((a, b) => a.position - b.position);
}

/**
 * Extract intervals from accumulated TimingData.
 * One interval entry per driver with gap to leader and interval to car ahead.
 */
export function translateIntervals(
  state: AccumulatedState,
  sessionKey: number,
): OpenF1Interval[] {
  const lines = state.timingData.Lines;
  if (!lines) return [];

  const now = new Date().toISOString();
  const intervals: OpenF1Interval[] = [];

  for (const [driverNum, line] of Object.entries(lines)) {
    intervals.push({
      session_key: sessionKey,
      driver_number: parseInt(driverNum, 10),
      gap_to_leader: parseGapValue(line.GapToLeader),
      interval: parseGapValue(line.IntervalToPositionAhead?.Value),
      date: now,
    });
  }

  return intervals;
}

/**
 * Build a full list of laps from accumulated TimingData.
 * Each driver's NumberOfLaps tells us how many laps they've completed.
 * We store the last lap time/sectors from the most recent timing update.
 */
export function translateLaps(
  state: AccumulatedState,
  sessionKey: number,
  lapHistory: Map<string, OpenF1Lap>,
): OpenF1Lap[] {
  const lines = state.timingData.Lines;
  if (!lines) return Array.from(lapHistory.values());

  const now = new Date().toISOString();

  for (const [driverNum, line] of Object.entries(lines)) {
    const numLaps = line.NumberOfLaps;
    if (numLaps === undefined || numLaps < 1) continue;

    const key = `${driverNum}_${numLaps}`;
    const driverNumber = parseInt(driverNum, 10);

    // Only create/update if we have data for this lap
    const existing = lapHistory.get(key);
    const lap: OpenF1Lap = existing ?? {
      session_key: sessionKey,
      driver_number: driverNumber,
      lap_number: numLaps,
      lap_duration: null,
      duration_sector_1: null,
      duration_sector_2: null,
      duration_sector_3: null,
      is_pit_out_lap: line.PitOut === true,
      st_speed: null,
      date_start: now,
    };

    // Update with latest timing data
    if (line.LastLapTime?.Value) {
      lap.lap_duration = parseLapTimeToSeconds(line.LastLapTime.Value);
    }

    const sectors = line.Sectors;
    if (sectors) {
      if (sectors["0"]?.Value) {
        lap.duration_sector_1 = parseLapTimeToSeconds(sectors["0"].Value);
      }
      if (sectors["1"]?.Value) {
        lap.duration_sector_2 = parseLapTimeToSeconds(sectors["1"].Value);
      }
      if (sectors["2"]?.Value) {
        lap.duration_sector_3 = parseLapTimeToSeconds(sectors["2"].Value);
      }
    }

    if (line.Speeds?.ST?.Value) {
      lap.st_speed = parseFloat(line.Speeds.ST.Value) || null;
    }

    if (line.PitOut === true) {
      lap.is_pit_out_lap = true;
    }

    lapHistory.set(key, lap);
  }

  return Array.from(lapHistory.values());
}

/**
 * Detect pit stops from accumulated TimingData.
 * A pit stop is detected when InPit transitions to true.
 */
export function translatePitStops(
  state: AccumulatedState,
  sessionKey: number,
  knownPitStops: OpenF1Pit[],
  inPitState: Map<string, boolean>,
): OpenF1Pit[] {
  const lines = state.timingData.Lines;
  if (!lines) return knownPitStops;

  const now = new Date().toISOString();

  for (const [driverNum, line] of Object.entries(lines)) {
    const wasInPit = inPitState.get(driverNum) ?? false;
    const isInPit = line.InPit === true;

    if (isInPit && !wasInPit) {
      const lapNumber = line.NumberOfLaps ?? 0;
      // Check we haven't already recorded a pit on this lap for this driver
      const alreadyRecorded = knownPitStops.some(
        (p) =>
          p.driver_number === parseInt(driverNum, 10) &&
          p.lap_number === lapNumber,
      );
      if (!alreadyRecorded) {
        knownPitStops.push({
          session_key: sessionKey,
          driver_number: parseInt(driverNum, 10),
          pit_duration: null, // Not available from SignalR
          lap_number: lapNumber,
          date: now,
        });
      }
    }

    if (line.InPit !== undefined) {
      inPitState.set(driverNum, isInPit);
    }
  }

  return knownPitStops;
}
