#!/usr/bin/env node

/**
 * One-time backfill of all FIA stewards decisions (2019-2025).
 * Downloads and parses penalty-related PDFs, stores structured data
 * in app/data/fia-decisions.json.
 *
 * Usage:
 *   node scripts/backfill-fia-decisions.mjs                          # dry-run
 *   node scripts/backfill-fia-decisions.mjs --write                  # run and save
 *   node scripts/backfill-fia-decisions.mjs --season 2023 --write    # single season
 *   node scripts/backfill-fia-decisions.mjs --resume --write         # resume from checkpoint
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  getAllSeasons,
  fetchEventIds,
  fetchEventDocumentsByEventId,
  downloadPdf,
} from "./lib/fia-scraper.mjs";
import { parseFiaDecisionPdf } from "./lib/fia-pdf-parser.mjs";
import { fetchRaceCalendar } from "./lib/race-calendar.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "app", "data", "fia-decisions.json");
const CHECKPOINT_PATH = join(__dirname, "cache", ".backfill-checkpoint.json");
const CACHE_DIR = join(__dirname, "cache");

// ── Checkpoint system ───────────────────────────────────────────────────────

function loadCheckpoint() {
  if (!existsSync(CHECKPOINT_PATH)) return null;
  return JSON.parse(readFileSync(CHECKPOINT_PATH, "utf-8"));
}

function saveCheckpoint(checkpoint) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoint, null, 2));
}

// ── Load/save decisions ─────────────────────────────────────────────────────

function loadDecisions() {
  if (!existsSync(DATA_PATH)) {
    return { lastUpdated: null, decisions: [] };
  }
  return JSON.parse(readFileSync(DATA_PATH, "utf-8"));
}

function saveDecisions(data) {
  data.lastUpdated = new Date().toISOString().slice(0, 10);
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n");
}

// ── Resolve round number from race calendar ─────────────────────────────────

async function buildRoundMap(season) {
  try {
    const races = await fetchRaceCalendar(season);
    const map = new Map();
    for (const race of races) {
      map.set(race.raceName.toLowerCase(), parseInt(race.round));
    }
    return map;
  } catch {
    return new Map();
  }
}

function resolveRound(eventName, roundMap) {
  const lower = eventName.toLowerCase();
  for (const [name, round] of roundMap) {
    if (lower.includes(name.replace(/ grand prix$/i, "")) || name.includes(lower.replace(/ grand prix$/i, ""))) {
      return round;
    }
  }
  return null;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const writeMode = process.argv.includes("--write");
  const resumeMode = process.argv.includes("--resume");
  const seasonIdx = process.argv.indexOf("--season");
  const targetSeason = seasonIdx !== -1 ? parseInt(process.argv[seasonIdx + 1]) : null;

  const allSeasons = targetSeason ? [targetSeason] : getAllSeasons();
  const data = loadDecisions();
  const existingUrls = new Set(data.decisions.map((d) => d.pdfUrl));

  // Load checkpoint for resume
  let checkpoint = resumeMode ? loadCheckpoint() : null;
  if (checkpoint) {
    console.log(`Resuming from checkpoint (${checkpoint.totalDecisions} decisions so far)\n`);
  } else {
    checkpoint = {
      startedAt: new Date().toISOString(),
      seasons: {},
      processedEventIds: [],
      totalDecisions: data.decisions.length,
      totalFailures: 0,
    };
  }

  const completedEventIds = new Set(checkpoint.processedEventIds || []);
  let newDecisions = 0;
  let parseFailures = 0;

  for (const season of allSeasons) {
    if (checkpoint.seasons[season]?.status === "complete" && resumeMode) {
      console.log(`⏭ ${season}: already complete (${checkpoint.seasons[season].decisions} decisions)\n`);
      continue;
    }

    console.log(`\n${"═".repeat(60)}`);
    console.log(`  ${season} SEASON`);
    console.log(`${"═".repeat(60)}\n`);

    let events;
    try {
      events = await fetchEventIds(season);
    } catch (err) {
      console.error(`⚠ Could not fetch ${season} events: ${err.message}`);
      checkpoint.seasons[season] = { status: "failed", error: err.message };
      continue;
    }

    // Filter out test events
    const raceEvents = Object.entries(events).filter(
      ([name]) => !/test|pre-?season/i.test(name),
    );

    console.log(`Found ${raceEvents.length} race events\n`);

    // Build round map from Jolpica
    const roundMap = await buildRoundMap(season);

    let seasonDecisions = 0;

    for (const [eventName, eventId] of raceEvents) {
      if (completedEventIds.has(eventId) && resumeMode) {
        console.log(`  ⏭ ${eventName} — already processed`);
        continue;
      }

      process.stdout.write(`  ${eventName}...`);

      let docs;
      try {
        docs = await fetchEventDocumentsByEventId(eventId, eventName);
      } catch (err) {
        console.log(` ⚠ fetch failed: ${err.message}`);
        continue;
      }

      console.log(` ${docs.length} docs`);

      const round = resolveRound(eventName, roundMap);
      let eventDecisions = 0;

      for (const doc of docs) {
        // Skip if already in dataset
        if (existingUrls.has(doc.pdfUrl)) continue;

        let parsed;
        try {
          const buffer = await downloadPdf(doc.pdfUrl);
          parsed = await parseFiaDecisionPdf(buffer);
        } catch (err) {
          console.log(`    ⚠ Parse failed: ${doc.title} — ${err.message}`);
          parseFailures++;
          continue;
        }

        const id = `FIA-${season}-${eventId}-${doc.docNumber || "x"}`;

        const decision = {
          id,
          season,
          round,
          raceName: eventName,
          eventId,
          docNumber: doc.docNumber || parsed.documentNumber,
          title: doc.title,
          pdfUrl: doc.pdfUrl,
          publishedDate: doc.publishedDate,
          carNumber: doc.carNumber || parsed.carNumber,
          driverName: parsed.driverName,
          competitor: parsed.competitor,
          session: parsed.session,
          fact: parsed.fact,
          offence: parsed.offence,
          decisionText: parsed.decisionText,
          reason: parsed.reason,
          penalties: {
            penaltyPoints: parsed.penalties.penaltyPoints,
            timePenalty: parsed.penalties.timePenalty,
            gridPenalty: parsed.penalties.gridPenalty,
            driveThrough: parsed.penalties.driveThrough,
            reprimand: parsed.penalties.reprimand,
            disqualified: parsed.penalties.disqualified,
            fine: parsed.penalties.fine,
          },
          noFurtherAction: parsed.noFurtherAction,
        };

        data.decisions.push(decision);
        existingUrls.add(doc.pdfUrl);
        eventDecisions++;
        newDecisions++;
      }

      if (eventDecisions > 0) {
        console.log(`    + ${eventDecisions} new decisions`);
      }

      seasonDecisions += eventDecisions;
      completedEventIds.add(eventId);
      checkpoint.processedEventIds.push(eventId);

      // Save checkpoint after each event
      checkpoint.totalDecisions = data.decisions.length;
      checkpoint.totalFailures += parseFailures;
      if (writeMode) saveCheckpoint(checkpoint);
    }

    checkpoint.seasons[season] = {
      status: "complete",
      events: raceEvents.length,
      decisions: seasonDecisions,
    };

    console.log(`\n  ${season} complete: ${seasonDecisions} new decisions\n`);

    // Save after each season for safety
    if (writeMode) {
      saveDecisions(data);
      saveCheckpoint(checkpoint);
      console.log(`  ✓ Saved (${data.decisions.length} total decisions)\n`);
    }
  }

  // Final summary
  console.log(`\n${"═".repeat(60)}`);
  console.log("  BACKFILL COMPLETE");
  console.log(`${"═".repeat(60)}\n`);
  console.log(`  Total decisions: ${data.decisions.length}`);
  console.log(`  New this run:    ${newDecisions}`);
  console.log(`  Parse failures:  ${parseFailures}`);
  console.log();

  if (writeMode) {
    saveDecisions(data);
    console.log(`✓ Saved to ${DATA_PATH}`);
  } else if (newDecisions > 0) {
    console.log(`Run with --write to save ${newDecisions} new decisions.`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
