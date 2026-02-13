import type {
  DriverStanding,
  ConstructorStanding,
  RaceWithResults,
  DriverStandingsResponse,
  ConstructorStandingsResponse,
  RaceResultsResponse,
  SeasonsResponse,
  HistoryData,
} from "@/app/types/history";
import { resolveEspnHeadshots } from "@/app/lib/espn";

const BASE_URL = "https://api.jolpi.ca/ergast/f1";
const CURRENT_YEAR = 2026;

function revalidateFor(year: number): number {
  // Current/future seasons refresh hourly; past seasons refresh daily
  return year >= CURRENT_YEAR ? 3600 : 604800;
}

export async function fetchDriverStandings(
  year: number,
): Promise<DriverStanding[]> {
  const res = await fetch(`${BASE_URL}/${year}/driverstandings.json`, {
    next: { revalidate: revalidateFor(year) },
  });
  if (!res.ok) return [];

  const data: DriverStandingsResponse = await res.json();
  const lists = data.MRData.StandingsTable.StandingsLists;
  return lists.length > 0 ? lists[0].DriverStandings : [];
}

export async function fetchConstructorStandings(
  year: number,
): Promise<ConstructorStanding[]> {
  const res = await fetch(`${BASE_URL}/${year}/constructorstandings.json`, {
    next: { revalidate: revalidateFor(year) },
  });
  if (!res.ok) return [];

  const data: ConstructorStandingsResponse = await res.json();
  const lists = data.MRData.StandingsTable.StandingsLists;
  return lists.length > 0 ? lists[0].ConstructorStandings : [];
}

export async function fetchSeasonResults(
  year: number,
): Promise<RaceWithResults[]> {
  const PAGE_SIZE = 100;
  const raceMap = new Map<string, RaceWithResults>();
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const res = await fetch(
      `${BASE_URL}/${year}/results.json?limit=${PAGE_SIZE}&offset=${offset}`,
      { next: { revalidate: revalidateFor(year) } },
    );
    if (!res.ok) break;

    const data: RaceResultsResponse = await res.json();
    total = parseInt(data.MRData.total, 10);

    for (const race of data.MRData.RaceTable.Races) {
      const existing = raceMap.get(race.round);
      if (existing) {
        // Merge results for races split across pages
        existing.Results.push(...race.Results);
      } else {
        raceMap.set(race.round, { ...race, Results: [...race.Results] });
      }
    }

    offset += PAGE_SIZE;
  }

  return Array.from(raceMap.values()).sort(
    (a, b) => parseInt(a.round, 10) - parseInt(b.round, 10),
  );
}

export async function fetchAvailableSeasons(): Promise<number[]> {
  const res = await fetch(`${BASE_URL}/seasons.json?limit=100`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return [];

  const data: SeasonsResponse = await res.json();
  return data.MRData.SeasonTable.Seasons.map((s) => parseInt(s.season, 10)).sort(
    (a, b) => b - a,
  );
}

export async function fetchHistoryData(year: number): Promise<HistoryData> {
  const [driverStandings, constructorStandings, races] = await Promise.all([
    fetchDriverStandings(year),
    fetchConstructorStandings(year),
    fetchSeasonResults(year),
  ]);

  // Collect all unique drivers across standings and race results
  const driverMap = new Map<
    string,
    { driverId: string; givenName: string; familyName: string }
  >();
  for (const s of driverStandings) {
    driverMap.set(s.Driver.driverId, s.Driver);
  }
  for (const race of races) {
    for (const r of race.Results) {
      if (!driverMap.has(r.Driver.driverId)) {
        driverMap.set(r.Driver.driverId, r.Driver);
      }
    }
  }

  const driverHeadshots = await resolveEspnHeadshots(
    year,
    Array.from(driverMap.values()),
  );

  return { season: year, driverStandings, constructorStandings, races, driverHeadshots };
}
