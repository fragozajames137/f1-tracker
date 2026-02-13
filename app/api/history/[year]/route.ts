import { NextResponse } from "next/server";
import { fetchHistoryData } from "@/app/lib/history";

const CURRENT_YEAR = 2026;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ year: string }> },
) {
  const { year: yearParam } = await params;
  const year = parseInt(yearParam, 10);

  if (isNaN(year) || year < 1950 || year > CURRENT_YEAR) {
    return NextResponse.json(
      { error: "Year must be an integer between 1950 and 2026" },
      { status: 400 },
    );
  }

  const data = await fetchHistoryData(year);

  const isPast = year < CURRENT_YEAR;
  const cacheControl = isPast
    ? "public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400"
    : "public, max-age=300, s-maxage=3600, stale-while-revalidate=300";

  return NextResponse.json(data, {
    headers: { "Cache-Control": cacheControl },
  });
}
