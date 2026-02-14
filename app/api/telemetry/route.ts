import { NextRequest, NextResponse } from "next/server";
import { loadTelemetrySession } from "@/app/lib/telemetry";
import { getCacheControl } from "@/app/lib/db-queries";

export async function GET(request: NextRequest) {
  const filename = request.nextUrl.searchParams.get("file");

  if (!filename || !/^[\w\-]+\.json$/.test(filename)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const session = await loadTelemetrySession(filename);
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(session, {
    headers: {
      "Cache-Control": getCacheControl(session.year),
    },
  });
}
