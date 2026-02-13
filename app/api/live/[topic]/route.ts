import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { liveState } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const VALID_TOPICS = new Set([
  "sessions",
  "drivers",
  "positions",
  "laps",
  "intervals",
  "pit_stops",
  "race_control",
  "weather",
  "team_radio",
  "stints",
  "meta",
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ topic: string }> },
) {
  const { topic } = await params;

  if (!VALID_TOPICS.has(topic)) {
    return NextResponse.json(
      { error: `Invalid topic: ${topic}` },
      { status: 400 },
    );
  }

  const sessionKeyParam = request.nextUrl.searchParams.get("session_key");
  if (!sessionKeyParam) {
    return NextResponse.json(
      { error: "session_key is required" },
      { status: 400 },
    );
  }

  const sessionKey = parseInt(sessionKeyParam, 10);
  if (isNaN(sessionKey)) {
    return NextResponse.json(
      { error: "session_key must be a number" },
      { status: 400 },
    );
  }

  const db = getDb();
  const row = await db
    .select()
    .from(liveState)
    .where(
      and(eq(liveState.sessionKey, sessionKey), eq(liveState.topic, topic)),
    )
    .get();

  if (!row) {
    return NextResponse.json(
      { data: [], updated_at: null },
      {
        status: 200,
        headers: { "Cache-Control": "max-age=2, stale-while-revalidate=5" },
      },
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(row.data);
  } catch {
    data = [];
  }

  return NextResponse.json(
    { data, updated_at: row.updatedAt },
    {
      status: 200,
      headers: { "Cache-Control": "max-age=2, stale-while-revalidate=5" },
    },
  );
}
