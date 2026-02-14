import { NextResponse } from "next/server";
import { getSessionDetail, getCacheControl } from "@/app/lib/db-queries";
import { listTelemetryFiles, loadTelemetrySession } from "@/app/lib/telemetry";

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

  // Get session metadata to find year/round
  const session = await getSessionDetail(sessionKey);
  if (!session) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 },
    );
  }

  // Find matching telemetry file by year + round
  const files = await listTelemetryFiles();
  const match = files.find(
    (f) => f.year === session.year && f.round === session.round,
  );

  if (!match) {
    return NextResponse.json(
      { messages: [], drivers: [] },
      { headers: { "Cache-Control": getCacheControl(session.year) } },
    );
  }

  const telemetry = await loadTelemetrySession(match.filename);
  if (!telemetry || !telemetry.teamRadioMessages?.length) {
    return NextResponse.json(
      { messages: [], drivers: [] },
      { headers: { "Cache-Control": getCacheControl(session.year) } },
    );
  }

  // Build driver lookup from telemetry data
  const drivers = telemetry.drivers.map((d) => ({
    number: d.number,
    abbreviation: d.abbreviation,
    fullName: d.fullName,
    teamName: d.teamName,
    teamColor: d.teamColor,
  }));

  // Map audio files to served URLs
  // In production, NEXT_PUBLIC_AUDIO_BASE_URL points to R2 (e.g. "https://audio.poletopaddock.com")
  // In dev, falls back to the local /api/audio/ route
  const audioBase = process.env.NEXT_PUBLIC_AUDIO_BASE_URL;
  const messages = telemetry.teamRadioMessages.map((msg) => ({
    driverNumber: msg.driverNumber,
    timestamp: msg.timestamp,
    audioUrl: audioBase
      ? `${audioBase}/${msg.audioFile}`
      : `/api/audio/${msg.audioFile}`,
  }));

  return NextResponse.json(
    { messages, drivers },
    { headers: { "Cache-Control": getCacheControl(session.year) } },
  );
}
