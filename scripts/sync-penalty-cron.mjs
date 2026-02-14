#!/usr/bin/env node

/**
 * Cron entry point for penalty points syncing.
 * Designed to run every 30 minutes via launchd.
 * Exits immediately if not during a race weekend.
 *
 * During race weekends:
 *  - Runs Liquipedia sync every invocation (every 30 min)
 *  - Runs FIA enrichment once per day
 */

import { execFileSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { isRaceWeekend } from "./lib/race-calendar.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, "cache");
const LOGS_DIR = join(__dirname, "logs");
const FIA_MARKER = join(CACHE_DIR, ".fia-enrichment-marker");
const NODE = process.execPath;

function log(msg) {
  const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
  console.log(`[${ts}] ${msg}`);
}

function ensureDirs() {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  if (!existsSync(LOGS_DIR)) mkdirSync(LOGS_DIR, { recursive: true });
}

function runScript(scriptName, args = []) {
  const scriptPath = join(__dirname, scriptName);
  log(`Running ${scriptName}...`);
  try {
    const output = execFileSync(NODE, [scriptPath, ...args], {
      encoding: "utf-8",
      timeout: 120000, // 2 min timeout
      cwd: join(__dirname, ".."),
    });
    // Print indented output
    for (const line of output.trim().split("\n")) {
      console.log(`  ${line}`);
    }
    return true;
  } catch (err) {
    log(`✗ ${scriptName} failed: ${err.message}`);
    if (err.stdout) console.log(err.stdout);
    if (err.stderr) console.error(err.stderr);
    return false;
  }
}

function shouldRunFiaEnrichment() {
  const today = new Date().toISOString().slice(0, 10);
  if (!existsSync(FIA_MARKER)) return true;
  const lastRun = readFileSync(FIA_MARKER, "utf-8").trim();
  return lastRun !== today;
}

function markFiaEnrichmentDone() {
  const today = new Date().toISOString().slice(0, 10);
  writeFileSync(FIA_MARKER, today);
}

async function main() {
  ensureDirs();

  // Determine current season from year
  const season = new Date().getFullYear();

  log(`Checking race weekend status (season ${season})...`);

  let status;
  try {
    status = await isRaceWeekend(season);
  } catch (err) {
    log(`⚠ Could not check race calendar: ${err.message}`);
    log("Skipping sync.");
    return;
  }

  if (!status.active) {
    if (status.nextRace) {
      log(
        `Not race weekend. Next: ${status.nextRace.raceName} (Round ${status.nextRace.round}) starts ${status.nextRace.windowStart.toISOString().slice(0, 16)}`,
      );
    } else {
      log("Not race weekend. No upcoming races found in calendar.");
    }
    return;
  }

  log(`Race weekend active: ${status.race.raceName} (Round ${status.race.round})`);

  // Always run Liquipedia sync
  runScript("sync-penalty-points.mjs", ["--write"]);

  // Run FIA enrichment once per day
  if (shouldRunFiaEnrichment()) {
    log("FIA enrichment not yet run today.");
    const success = runScript("enrich-fia-documents.mjs", ["--write"]);
    if (success) markFiaEnrichmentDone();
  } else {
    log("FIA enrichment already ran today — skipping.");
  }

  log("Cron cycle complete.");
}

main().catch((err) => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
});
