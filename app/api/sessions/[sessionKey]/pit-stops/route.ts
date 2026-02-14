import { NextResponse } from "next/server";
import { getPitStops, getCacheControl, getSessionYear } from "@/app/lib/db-queries";

export async function GET(
  _request: Request,
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

  const [year, pitStops] = await Promise.all([
    getSessionYear(sessionKey),
    getPitStops(sessionKey),
  ]);

  return NextResponse.json(pitStops, {
    headers: { "Cache-Control": getCacheControl(year ?? undefined) },
  });
}
