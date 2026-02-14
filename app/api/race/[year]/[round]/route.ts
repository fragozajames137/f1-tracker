import { NextResponse } from "next/server";
import { getSessionsByYear, getCacheControl } from "@/app/lib/db-queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ year: string; round: string }> },
) {
  const { year: yearParam, round: roundParam } = await params;
  const year = parseInt(yearParam, 10);
  const round = parseInt(roundParam, 10);

  if (isNaN(year) || year < 2018 || year > 2026) {
    return NextResponse.json(
      { error: "year must be between 2018 and 2026" },
      { status: 400 },
    );
  }

  if (isNaN(round) || round < 1) {
    return NextResponse.json(
      { error: "Invalid round number" },
      { status: 400 },
    );
  }

  // Fetch race metadata from Jolpica
  const jolpicaRes = await fetch(
    `https://api.jolpi.ca/ergast/f1/${year}/${round}.json`,
    { next: { revalidate: 86400 } },
  );

  let raceInfo = null;
  if (jolpicaRes.ok) {
    const data = await jolpicaRes.json();
    const races = data?.MRData?.RaceTable?.Races;
    if (races && races.length > 0) {
      raceInfo = races[0];
    }
  }

  // Fetch ingested sessions from Turso — filter out pre-season testing
  const allSessions = await getSessionsByYear(year, undefined, round);
  const sessions = allSessions.filter(
    (s) => !s.meetingName.toLowerCase().includes("testing"),
  );

  return NextResponse.json(
    { raceInfo, sessions },
    { headers: { "Cache-Control": getCacheControl(year) } },
  );
}
