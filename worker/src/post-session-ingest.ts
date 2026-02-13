import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { log, logError } from "./utils.js";

const execFileAsync = promisify(execFile);
const CURRENT_YEAR = 2026;

// Resolve project root (worker/src/ → project root)
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..", "..");

/**
 * Run ingest-static.ts for the current year to populate normalized tables
 * (sessionDrivers, laps, lapPositions, stints, pitStops, weatherSeries, etc.)
 * from F1's static archive. Skips already-ingested sessions automatically.
 *
 * This is fire-and-forget safe — failures are logged but don't crash the worker.
 */
export async function ingestStaleSessions(): Promise<void> {
  log(`Running post-session ingest for ${CURRENT_YEAR}...`);
  try {
    const { stdout, stderr } = await execFileAsync(
      "npx",
      ["tsx", "scripts/ingest-static.ts", "--year", String(CURRENT_YEAR)],
      {
        cwd: PROJECT_ROOT,
        timeout: 10 * 60 * 1000, // 10 minute timeout
        env: { ...process.env },
      },
    );
    if (stdout) {
      for (const line of stdout.trim().split("\n")) {
        log(`  [ingest] ${line}`);
      }
    }
    if (stderr) {
      for (const line of stderr.trim().split("\n")) {
        logError(`  [ingest] ${line}`);
      }
    }
    log("Post-session ingest complete");
  } catch (err) {
    logError("Post-session ingest failed (non-fatal):", err);
  }
}
