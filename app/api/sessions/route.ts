import { NextRequest, NextResponse } from "next/server";
import { getSessionsByYear, getCacheControl } from "@/app/lib/db-queries";

export async function GET(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get("year");
  const type = request.nextUrl.searchParams.get("type") || undefined;
  const roundParam = request.nextUrl.searchParams.get("round");

  if (!yearParam) {
    return NextResponse.json(
      { error: "year parameter is required" },
      { status: 400 },
    );
  }

  const year = parseInt(yearParam, 10);
  if (isNaN(year) || year < 2018 || year > 2026) {
    return NextResponse.json(
      { error: "year must be between 2018 and 2026" },
      { status: 400 },
    );
  }

  const round = roundParam ? parseInt(roundParam, 10) : undefined;
  const sessions = await getSessionsByYear(year, type, round);

  return NextResponse.json(sessions, {
    headers: { "Cache-Control": getCacheControl(year) },
  });
}
