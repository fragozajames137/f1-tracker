import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "app", "data");
const AUDIO_BASE_URL = process.env.NEXT_PUBLIC_AUDIO_BASE_URL;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const relPath = segments.join("/");

  // Validate: must start with "radio/" and end with ".mp3"
  if (!relPath.startsWith("radio/") || !relPath.endsWith(".mp3")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Validate: only allow alphanumeric, dashes, underscores, dots, and slashes
  if (!/^radio\/[\w\-./]+\.mp3$/.test(relPath)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  // In production, redirect to R2
  if (AUDIO_BASE_URL) {
    return NextResponse.redirect(`${AUDIO_BASE_URL}/${relPath}`, 302);
  }

  // In dev (no R2 URL set), serve from disk
  const filePath = path.resolve(DATA_DIR, relPath);

  // Prevent path traversal — resolved path must stay inside DATA_DIR/radio/
  const radioDir = path.join(DATA_DIR, "radio");
  if (!filePath.startsWith(radioDir)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
