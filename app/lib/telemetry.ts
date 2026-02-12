import { readdir, readFile } from "fs/promises";
import path from "path";
import type { TelemetrySession, TelemetryFileInfo } from "@/app/types/telemetry";

const DATA_DIR = path.join(process.cwd(), "app", "data", "telemetry");

export async function listTelemetryFiles(): Promise<TelemetryFileInfo[]> {
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
  try {
    const filePath = path.join(DATA_DIR, filename);
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as TelemetrySession;
  } catch {
    return null;
  }
}
