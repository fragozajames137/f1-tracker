import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { liveState, sessions, meetings } from "@/db/schema";
import { eq, and, gt, lte, asc, desc } from "drizzle-orm";
import type { OpenF1Session } from "@/app/types/openf1";

const CURRENT_YEAR = 2026;

function mapScheduleRow(row: {
  sessionKey: number;
  sessionName: string;
  sessionType: string;
  startDate: string | null;
  endDate: string | null;
  gmtOffset: string | null;
  meetingName: string;
  location: string | null;
  country: string | null;
  circuit: string | null;
}): OpenF1Session {
  return {
    session_key: row.sessionKey,
    session_name: row.sessionName,
    session_type: row.sessionType,
    date_start: row.startDate ?? "",
    date_end: row.endDate ?? "",
    gmt_offset: row.gmtOffset ?? "+00:00",
    country_key: 0,
    country_code: "",
    country_name: row.country ?? "",
    circuit_key: 0,
    circuit_short_name: row.circuit ?? "",
    location: row.location ?? "",
    year: CURRENT_YEAR,
  };
}

const scheduleSelect = {
  sessionKey: sessions.key,
  sessionName: sessions.name,
  sessionType: sessions.type,
  startDate: sessions.startDate,
  endDate: sessions.endDate,
  gmtOffset: sessions.gmtOffset,
  meetingName: meetings.name,
  location: meetings.location,
  country: meetings.country,
  circuit: meetings.circuit,
};

export async function GET() {
  const db = getDb();

  // 1. Get all sessions with captured live data (from meta topic)
  const metaRows = await db
    .select({
      sessionKey: liveState.sessionKey,
      data: liveState.data,
      updatedAt: liveState.updatedAt,
    })
    .from(liveState)
    .where(eq(liveState.topic, "meta"))
    .orderBy(desc(liveState.updatedAt));

  // Parse each meta row — the data contains { session: OpenF1Session, ... }
  const capturedSessions: OpenF1Session[] = [];
  const seenKeys = new Set<number>();

  for (const row of metaRows) {
    try {
      const parsed = JSON.parse(row.data);
      const session: OpenF1Session | null = parsed?.session ?? null;
      if (session && session.session_key) {
        capturedSessions.push(session);
        seenKeys.add(session.session_key);
      }
    } catch {
      // Skip malformed meta rows
    }
  }

  const now = new Date().toISOString();

  // 2. Get the next upcoming session from the schedule
  const upcomingRow = await db
    .select(scheduleSelect)
    .from(sessions)
    .innerJoin(meetings, eq(sessions.meetingKey, meetings.key))
    .where(and(eq(meetings.year, CURRENT_YEAR), gt(sessions.startDate, now)))
    .orderBy(asc(sessions.startDate))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  // 3. If no live data captured yet, include recent past sessions from the
  //    schedule so the page isn't empty before the worker has run.
  const scheduleSessions: (OpenF1Session & { _upcoming?: boolean })[] = [];
  if (capturedSessions.length === 0) {
    const recentRows = await db
      .select(scheduleSelect)
      .from(sessions)
      .innerJoin(meetings, eq(sessions.meetingKey, meetings.key))
      .where(
        and(eq(meetings.year, CURRENT_YEAR), lte(sessions.startDate, now)),
      )
      .orderBy(desc(sessions.startDate))
      .limit(10);

    for (const row of recentRows) {
      if (!seenKeys.has(row.sessionKey)) {
        scheduleSessions.push(mapScheduleRow(row));
        seenKeys.add(row.sessionKey);
      }
    }
  }

  // Map upcoming session
  if (upcomingRow && !seenKeys.has(upcomingRow.sessionKey)) {
    scheduleSessions.push({
      ...mapScheduleRow(upcomingRow),
      _upcoming: true,
    });
  }

  // 4. Combine: captured sessions (newest first) + schedule sessions
  const allSessions = [...capturedSessions, ...scheduleSessions];

  return NextResponse.json(
    { sessions: allSessions },
    {
      status: 200,
      headers: { "Cache-Control": "max-age=10, stale-while-revalidate=30" },
    },
  );
}
