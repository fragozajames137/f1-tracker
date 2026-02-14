import { NextRequest, NextResponse } from "next/server";
import { getDriverById } from "@/app/lib/grid-data";
import { getDriverSeasonStats, getCacheControl } from "@/app/lib/db-queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const match = getDriverById(id);
  if (!match) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  const stats = await getDriverSeasonStats(match.driver.name);
  return NextResponse.json(stats, {
    headers: { "Cache-Control": getCacheControl() },
  });
}
