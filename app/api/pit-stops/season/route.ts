import { NextResponse } from "next/server";
import { getSeasonPitStops, getCacheControl } from "@/app/lib/db-queries";

const CURRENT_YEAR = 2026;
const OUTLIER_THRESHOLD = 10; // seconds — stops above this are considered outliers

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : CURRENT_YEAR;

  if (isNaN(year) || year < 2018 || year > 2030) {
    return NextResponse.json(
      { error: "Invalid year" },
      { status: 400 },
    );
  }

  const { stops, sessions } = await getSeasonPitStops(year);

  // Aggregate by team
  const teamMap = new Map<
    string,
    {
      teamName: string;
      teamColor: string;
      stops: Array<{
        stationaryTimeSeconds: number;
        pitLaneTimeSeconds: number | null;
        abbreviation: string;
        meetingName: string;
        round: number;
        lapNumber: number;
        stopNumber: number | null;
      }>;
      // Per-race averages for sparklines
      raceAverages: Map<number, number[]>;
      raceAveragesClean: Map<number, number[]>;
    }
  >();

  for (const stop of stops) {
    if (!stop.driver || stop.stationaryTimeSeconds === null) continue;

    const key = stop.driver.teamName;
    if (!teamMap.has(key)) {
      teamMap.set(key, {
        teamName: stop.driver.teamName,
        teamColor: stop.driver.teamColor,
        stops: [],
        raceAverages: new Map(),
        raceAveragesClean: new Map(),
      });
    }

    const team = teamMap.get(key)!;
    team.stops.push({
      stationaryTimeSeconds: stop.stationaryTimeSeconds,
      pitLaneTimeSeconds: stop.pitLaneTimeSeconds,
      abbreviation: stop.driver.abbreviation,
      meetingName: stop.meetingName,
      round: stop.round,
      lapNumber: stop.lapNumber,
      stopNumber: stop.stopNumber,
    });

    // Track per-race for sparklines (all stops)
    if (!team.raceAverages.has(stop.round)) {
      team.raceAverages.set(stop.round, []);
    }
    team.raceAverages.get(stop.round)!.push(stop.stationaryTimeSeconds);

    // Track per-race for clean sparklines (no outliers)
    if (stop.stationaryTimeSeconds <= OUTLIER_THRESHOLD) {
      if (!team.raceAveragesClean.has(stop.round)) {
        team.raceAveragesClean.set(stop.round, []);
      }
      team.raceAveragesClean.get(stop.round)!.push(stop.stationaryTimeSeconds);
    }
  }

  function computeStats(times: number[]) {
    if (times.length === 0) return { avg: 0, best: 0, median: 0, stdDev: 0 };
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const best = Math.min(...times);
    const sorted = [...times].sort((a, b) => a - b);
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    const variance =
      times.reduce((sum, t) => sum + (t - avg) ** 2, 0) / times.length;
    const stdDev = Math.sqrt(variance);
    return { avg, best, median, stdDev };
  }

  // Build team rankings
  const teams = Array.from(teamMap.values())
    .map((team) => {
      const allTimes = team.stops.map((s) => s.stationaryTimeSeconds);
      const cleanTimes = allTimes.filter((t) => t <= OUTLIER_THRESHOLD);
      const outlierTimes = allTimes.filter((t) => t > OUTLIER_THRESHOLD);

      const raw = computeStats(allTimes);
      const clean = computeStats(cleanTimes);

      // Sparklines for both modes
      const sparkline = Array.from(team.raceAverages.entries())
        .sort(([a], [b]) => a - b)
        .map(([round, raceTimes]) => ({
          round,
          avg: raceTimes.reduce((a, b) => a + b, 0) / raceTimes.length,
        }));

      const sparklineClean = Array.from(team.raceAveragesClean.entries())
        .sort(([a], [b]) => a - b)
        .map(([round, raceTimes]) => ({
          round,
          avg: raceTimes.reduce((a, b) => a + b, 0) / raceTimes.length,
        }));

      return {
        teamName: team.teamName,
        teamColor: team.teamColor,
        // Raw stats (all stops)
        avgTime: Math.round(raw.avg * 1000) / 1000,
        bestTime: Math.round(raw.best * 1000) / 1000,
        medianTime: Math.round(raw.median * 1000) / 1000,
        totalStops: allTimes.length,
        consistency: Math.round(raw.stdDev * 1000) / 1000,
        sparkline,
        // Clean stats (outliers excluded)
        cleanAvgTime: Math.round(clean.avg * 1000) / 1000,
        cleanBestTime: Math.round(clean.best * 1000) / 1000,
        cleanMedianTime: Math.round(clean.median * 1000) / 1000,
        cleanStops: cleanTimes.length,
        cleanConsistency: Math.round(clean.stdDev * 1000) / 1000,
        sparklineClean,
        // Outlier info
        outlierCount: outlierTimes.length,
        longestStop: outlierTimes.length > 0
          ? Math.round(Math.max(...outlierTimes) * 1000) / 1000
          : null,
        stops: team.stops,
      };
    })
    .sort((a, b) => a.cleanAvgTime - b.cleanAvgTime);

  // Best individual stops across all teams
  const allStops = stops
    .filter((s) => s.driver && s.stationaryTimeSeconds !== null)
    .sort((a, b) => a.stationaryTimeSeconds! - b.stationaryTimeSeconds!)
    .slice(0, 10)
    .map((s) => ({
      stationaryTime: s.stationaryTimeSeconds!,
      pitLaneTime: s.pitLaneTimeSeconds,
      abbreviation: s.driver!.abbreviation,
      teamName: s.driver!.teamName,
      teamColor: s.driver!.teamColor,
      meetingName: s.meetingName,
      round: s.round,
      lapNumber: s.lapNumber,
    }));

  return NextResponse.json(
    { teams, bestStops: allStops },
    {
      headers: { "Cache-Control": getCacheControl(year) },
    },
  );
}
