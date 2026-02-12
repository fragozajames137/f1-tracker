import type {
  OpenF1Driver,
  OpenF1Position,
  ProjectedDriverStanding,
  ProjectedConstructorStanding,
} from "@/app/types/openf1";
import type { DriverStanding, ConstructorStanding } from "@/app/types/history";

const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];

function pointsForPosition(position: number, isSprint: boolean): number {
  const table = isSprint ? SPRINT_POINTS : RACE_POINTS;
  return position >= 1 && position <= table.length ? table[position - 1] : 0;
}

export function matchDriverToStanding(
  openf1Driver: OpenF1Driver,
  standings: DriverStanding[],
): DriverStanding | null {
  // Try matching by code first (most reliable)
  const byCode = standings.find(
    (s) =>
      s.Driver.code?.toUpperCase() === openf1Driver.name_acronym.toUpperCase(),
  );
  if (byCode) return byCode;

  // Fallback: match by family name
  const byName = standings.find(
    (s) =>
      s.Driver.familyName.toLowerCase() ===
      openf1Driver.last_name.toLowerCase(),
  );
  return byName ?? null;
}

export function computeProjectedDriverStandings(
  drivers: OpenF1Driver[],
  positions: OpenF1Position[],
  preRaceStandings: DriverStanding[],
  isSprint: boolean,
): ProjectedDriverStanding[] {
  // Build latest position per driver
  const latestPosition = new Map<number, number>();
  for (const p of positions) {
    latestPosition.set(p.driver_number, p.position);
  }

  const projected: ProjectedDriverStanding[] = [];

  for (const driver of drivers) {
    const standing = matchDriverToStanding(driver, preRaceStandings);
    const preRacePoints = standing ? parseFloat(standing.points) : 0;
    const preRacePosition = standing ? parseInt(standing.position, 10) : 99;

    const currentRacePosition = latestPosition.get(driver.driver_number) ?? null;
    const racePoints =
      currentRacePosition !== null
        ? pointsForPosition(currentRacePosition, isSprint)
        : 0;

    projected.push({
      driverCode: driver.name_acronym,
      driverName: driver.full_name,
      teamName: driver.team_name,
      teamColor: driver.team_colour ? `#${driver.team_colour}` : "#666",
      preRacePoints,
      projectedPoints: preRacePoints + racePoints,
      preRacePosition,
      projectedPosition: 0, // computed below after sorting
      positionDelta: 0,
      pointsDelta: racePoints,
      currentRacePosition,
    });
  }

  // Sort by projected points desc, then by pre-race position asc as tiebreaker
  projected.sort(
    (a, b) =>
      b.projectedPoints - a.projectedPoints ||
      a.preRacePosition - b.preRacePosition,
  );

  // Assign projected positions and compute deltas
  for (let i = 0; i < projected.length; i++) {
    projected[i].projectedPosition = i + 1;
    projected[i].positionDelta =
      projected[i].preRacePosition - projected[i].projectedPosition;
  }

  return projected;
}

export function computeProjectedConstructorStandings(
  projectedDrivers: ProjectedDriverStanding[],
  preRaceConstructors: ConstructorStanding[],
  drivers: OpenF1Driver[],
): ProjectedConstructorStanding[] {
  // Sum race points per team from projected drivers
  const teamRacePoints = new Map<string, number>();
  for (const pd of projectedDrivers) {
    const current = teamRacePoints.get(pd.teamName) ?? 0;
    teamRacePoints.set(pd.teamName, current + pd.pointsDelta);
  }

  // Build team color lookup from OpenF1 drivers
  const teamColorMap = new Map<string, string>();
  for (const d of drivers) {
    if (d.team_colour && !teamColorMap.has(d.team_name)) {
      teamColorMap.set(d.team_name, `#${d.team_colour}`);
    }
  }

  // Match OpenF1 team names to Jolpica constructor standings
  const projected: ProjectedConstructorStanding[] = preRaceConstructors.map(
    (cs) => {
      const preRacePoints = parseFloat(cs.points);
      const preRacePosition = parseInt(cs.position, 10);

      // Try to find matching team by checking if OpenF1 team name contains constructor name
      let racePointsForTeam = 0;
      let teamColor = "#666";
      for (const [teamName, pts] of teamRacePoints) {
        if (
          teamName.toLowerCase().includes(cs.Constructor.name.toLowerCase()) ||
          cs.Constructor.name.toLowerCase().includes(teamName.toLowerCase())
        ) {
          racePointsForTeam = pts;
          teamColor = teamColorMap.get(teamName) ?? "#666";
          break;
        }
      }

      return {
        constructorName: cs.Constructor.name,
        constructorId: cs.Constructor.constructorId,
        teamColor,
        preRacePoints,
        projectedPoints: preRacePoints + racePointsForTeam,
        preRacePosition,
        projectedPosition: 0,
        positionDelta: 0,
        pointsDelta: racePointsForTeam,
      };
    },
  );

  // Sort by projected points desc
  projected.sort(
    (a, b) =>
      b.projectedPoints - a.projectedPoints ||
      a.preRacePosition - b.preRacePosition,
  );

  for (let i = 0; i < projected.length; i++) {
    projected[i].projectedPosition = i + 1;
    projected[i].positionDelta =
      projected[i].preRacePosition - projected[i].projectedPosition;
  }

  return projected;
}
