import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { liveState } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const db = getDb();

  // Find the most recently updated "meta" topic — this tells us which session
  // the worker is currently streaming (or last streamed).
  const row = await db
    .select()
    .from(liveState)
    .where(eq(liveState.topic, "meta"))
    .orderBy(desc(liveState.updatedAt))
    .limit(1)
    .get();

  if (!row) {
    return NextResponse.json(
      { session_key: null, data: null, updated_at: null },
      {
        status: 200,
        headers: { "Cache-Control": "max-age=10, stale-while-revalidate=30" },
      },
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(row.data);
  } catch {
    data = null;
  }

  return NextResponse.json(
    {
      session_key: row.sessionKey,
      data,
      updated_at: row.updatedAt,
    },
    {
      status: 200,
      headers: { "Cache-Control": "max-age=2, stale-while-revalidate=5" },
    },
  );
}
