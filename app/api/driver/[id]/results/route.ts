import { NextRequest, NextResponse } from "next/server";
import { getDriverById } from "@/app/lib/grid-data";
import {
  getDriverRaceResults,
  getDriverYears,
  getCacheControl,
} from "@/app/lib/db-queries";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const match = getDriverById(id);
  if (!match) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  const yearParam = req.nextUrl.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : undefined;

  const [results, years] = await Promise.all([
    getDriverRaceResults(match.driver.name, year),
    getDriverYears(match.driver.name),
  ]);

  return NextResponse.json(
    { results, years },
    { headers: { "Cache-Control": getCacheControl(year) } },
  );
}
