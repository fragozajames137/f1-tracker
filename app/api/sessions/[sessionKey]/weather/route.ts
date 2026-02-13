import { NextResponse } from "next/server";
import { getWeather, getCacheControl } from "@/app/lib/db-queries";

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

  const weather = await getWeather(sessionKey);

  return NextResponse.json(weather, {
    headers: { "Cache-Control": getCacheControl() },
  });
}
