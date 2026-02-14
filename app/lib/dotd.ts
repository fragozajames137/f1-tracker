import dotdData from "@/app/data/dotd-2025.json";
import gridData from "@/app/data/grid-2026.json";
import type { DOTDSeason, DOTDRace, DOTDDriverStats, DOTDHighlights } from "@/app/types/dotd";
import type { GridData } from "@/app/types";

const data = dotdData as DOTDSeason;
const grid = gridData as GridData;

/** Build a lookup from driverId → grid info (team, color, nationality) */
function buildDriverLookup() {
  const map = new Map<
    string,
    { teamId: string; teamName: string; teamColor: string; nationality: string }
  >();

  for (const team of grid.teams) {
    for (const seat of [team.seat1, team.seat2]) {
      map.set(seat.id, {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color,
        nationality: seat.nationality,
      });
    }
  }

  return map;
}

/** Get the full season data */
export function getDOTDSeason(): DOTDSeason {
  return data;
}

/** Get DOTD result for a specific round */
export function getDOTDByRound(round: number): DOTDRace | null {
  return data.races.find((r) => r.round === round) ?? null;
}

/** Build leaderboard of DOTD winners + top-5 appearances, enriched with grid data */
export function getDOTDLeaderboard(): DOTDDriverStats[] {
  const driverLookup = buildDriverLookup();

  // Track per-driver stats
  const statsMap = new Map<
    string,
    {
      driverName: string;
      wins: number;
      topFiveAppearances: { round: number; raceName: string; percentage: number; won: boolean }[];
    }
  >();

  for (const race of data.races) {
    for (const candidate of race.topFive) {
      const existing = statsMap.get(candidate.driverId) ?? {
        driverName: candidate.driverName,
        wins: 0,
        topFiveAppearances: [],
      };

      const won = candidate.driverId === race.winnerId;
      if (won) existing.wins++;

      existing.topFiveAppearances.push({
        round: race.round,
        raceName: race.raceName,
        percentage: candidate.percentage,
        won,
      });

      statsMap.set(candidate.driverId, existing);
    }
  }

  const leaderboard: DOTDDriverStats[] = [];

  for (const [driverId, stats] of statsMap) {
    const gridInfo = driverLookup.get(driverId);

    const avgPercentage =
      stats.topFiveAppearances.reduce((sum, a) => sum + a.percentage, 0) /
      stats.topFiveAppearances.length;

    leaderboard.push({
      driverId,
      driverName: stats.driverName,
      teamId: gridInfo?.teamId ?? "unknown",
      teamName: gridInfo?.teamName ?? "Unknown",
      teamColor: gridInfo?.teamColor ?? "#666666",
      nationality: gridInfo?.nationality ?? "",
      wins: stats.wins,
      topFives: stats.topFiveAppearances.length,
      avgPercentage: Math.round(avgPercentage * 10) / 10,
      races: stats.topFiveAppearances,
    });
  }

  // Sort: wins desc, then topFives desc, then avgPercentage desc
  leaderboard.sort(
    (a, b) =>
      b.wins - a.wins ||
      b.topFives - a.topFives ||
      b.avgPercentage - a.avgPercentage,
  );

  return leaderboard;
}

/** Compute highlight stats for the season */
export function getDOTDHighlights(): DOTDHighlights {
  // Biggest landslide: highest single winner percentage
  let biggestLandslide = { driverName: "", raceName: "", percentage: 0 };
  for (const race of data.races) {
    const winner = race.topFive[0];
    if (winner && winner.percentage > biggestLandslide.percentage) {
      biggestLandslide = {
        driverName: race.winnerName,
        raceName: race.raceName,
        percentage: winner.percentage,
      };
    }
  }

  // Closest vote: smallest gap between 1st and 2nd
  let closestVote = { winnerName: "", runnerUpName: "", raceName: "", margin: Infinity };
  for (const race of data.races) {
    if (race.topFive.length >= 2) {
      const margin = race.topFive[0].percentage - race.topFive[1].percentage;
      if (margin < closestVote.margin) {
        closestVote = {
          winnerName: race.topFive[0].driverName,
          runnerUpName: race.topFive[1].driverName,
          raceName: race.raceName,
          margin: Math.round(margin * 10) / 10,
        };
      }
    }
  }

  // Most top-5 appearances
  const appearances = new Map<string, { name: string; count: number; wins: number }>();
  for (const race of data.races) {
    for (const c of race.topFive) {
      const existing = appearances.get(c.driverId) ?? { name: c.driverName, count: 0, wins: 0 };
      existing.count++;
      if (c.driverId === race.winnerId) existing.wins++;
      appearances.set(c.driverId, existing);
    }
  }
  let mostTopFives = { driverName: "", count: 0, wins: 0 };
  for (const [, stats] of appearances) {
    if (stats.count > mostTopFives.count) {
      mostTopFives = { driverName: stats.name, count: stats.count, wins: stats.wins };
    }
  }

  return {
    biggestLandslide,
    closestVote,
    mostTopFives,
    totalVotersEstimate: null,
  };
}
