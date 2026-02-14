import { readdir, readFile } from "fs/promises";
import path from "path";
import type { TelemetrySession, TelemetryFileInfo } from "@/app/types/telemetry";

const DATA_DIR = path.join(process.cwd(), "app", "data", "telemetry");
const MANIFEST_PATH = path.join(process.cwd(), "app", "data", "telemetry-manifest.json");
const TELEMETRY_BASE_URL = process.env.TELEMETRY_BASE_URL; // e.g. "https://f1-radio.<acct>.r2.dev/telemetry"

let manifestCache: TelemetryFileInfo[] | null = null;

async function loadManifest(): Promise<TelemetryFileInfo[]> {
  if (manifestCache) return manifestCache;
  try {
    const raw = await readFile(MANIFEST_PATH, "utf-8");
    manifestCache = JSON.parse(raw) as TelemetryFileInfo[];
    return manifestCache;
  } catch {
    return [];
  }
}

export async function listTelemetryFiles(): Promise<TelemetryFileInfo[]> {
  // In production (R2), use the committed manifest file
  if (TELEMETRY_BASE_URL) {
    const entries = await loadManifest();
    return [...entries].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.round - a.round;
    });
  }

  // In dev, scan the directory (picks up new files immediately)
  try {
    const files = await readdir(DATA_DIR);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((filename) => {
        // Parse filename: 2025-R01-australian-gp.json
        const match = filename.match(/^(\d{4})-R(\d{2})-(.+)\.json$/);
        if (!match) return null;
        return {
          filename,
          year: parseInt(match[1], 10),
          round: parseInt(match[2], 10),
          slug: match[3],
        };
      })
      .filter((f): f is TelemetryFileInfo => f !== null)
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.round - a.round;
      });
  } catch {
    return [];
  }
}

export async function loadTelemetrySession(
  filename: string,
): Promise<TelemetrySession | null> {
  // In production, fetch from R2
  if (TELEMETRY_BASE_URL) {
    try {
      const res = await fetch(`${TELEMETRY_BASE_URL}/${filename}`, {
        next: { revalidate: 86400 }, // cache for 24h on the server
      });
      if (!res.ok) return null;
      return (await res.json()) as TelemetrySession;
    } catch {
      return null;
    }
  }

  // In dev, read from disk
  try {
    const filePath = path.join(DATA_DIR, filename);
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as TelemetrySession;
  } catch {
    return null;
  }
}
