import { NextRequest, NextResponse } from "next/server";
import { getLaps, getCacheControl } from "@/app/lib/db-queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionKey: string }> },
) {
  const { sessionKey: keyParam } = await params;
  const sessionKey = parseInt(keyParam, 10);

  if (isNaN(sessionKey)) {
    return NextResponse.json(
      { error: "Invalid session key" },
      { status: 400 },
    );
  }

  const driverParam = request.nextUrl.searchParams.get("driver");
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  const driverNumber = driverParam ? parseInt(driverParam, 10) : undefined;
  const fromLap = fromParam ? parseInt(fromParam, 10) : undefined;
  const toLap = toParam ? parseInt(toParam, 10) : undefined;

  const laps = await getLaps(sessionKey, driverNumber, fromLap, toLap);

  return NextResponse.json(laps, {
    headers: { "Cache-Control": getCacheControl() },
  });
}
