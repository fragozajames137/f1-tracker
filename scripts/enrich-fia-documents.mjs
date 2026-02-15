#!/usr/bin/env node

/**
 * Enriches penalty-points.json with full penalty details from FIA stewards
 * decision data stored in fia-decisions.json.
 *
 * Usage:
 *   node scripts/enrich-fia-documents.mjs                # dry-run, match LP incidents
 *   node scripts/enrich-fia-documents.mjs --write        # writes changes
 *   node scripts/enrich-fia-documents.mjs --all --write  # re-match all LP incidents
 *   node scripts/enrich-fia-documents.mjs --sync --write # fetch new docs + enrich (for cron)
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  fetchEventDocuments,
  fetchEventDocumentsByEventId,
  fetchEventIds,
  downloadPdf,
} from "./lib/fia-scraper.mjs";
import { parseFiaDecisionPdf } from "./lib/fia-pdf-parser.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PP_PATH = join(__dirname, "..", "app", "data", "penalty-points.json");
const FIA_PATH = join(__dirname, "..", "app", "data", "fia-decisions.json");
const GRID_PATH = join(__dirname, "..", "app", "data", "grid-2026.json");
const NUMBERS_PATH = join(__dirname, "..", "app", "data", "driver-numbers.json");

// ── Car number → driver ID mapping ──────────────────────────────────────────
function buildCarNumberMap(season) {
  const map = new Map();

  // From grid data
  const grid = JSON.parse(readFileSync(GRID_PATH, "utf-8"));
  for (const team of grid.teams) {
    for (const seat of [team.seat1, team.seat2]) {
      if (seat.number != null) {
        map.set(seat.number, { driverId: seat.id, teamId: team.id });
      }
    }
  }

  // From driver-numbers.json for historical accuracy
  try {
    const numbersData = JSON.parse(readFileSync(NUMBERS_PATH, "utf-8"));
    for (const entry of numbersData.permanent) {
      for (const holder of entry.holders) {
        const firstYear = parseInt(holder.firstUsed);
        const lastYear = holder.lastUsed === "active" ? 9999 : parseInt(holder.lastUsed);
        if (season >= firstYear && season <= lastYear) {
          const driverId = holder.driver
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/\s+/g, "-");
          // Don't override grid data (more authoritative for current season)
          if (!map.has(entry.number)) {
            map.set(entry.number, { driverId, teamId: null });
          }
        }
      }
    }
  } catch {
    // driver-numbers.json may not exist
  }

  return map;
}

// ── Match FIA decision to existing incident ─────────────────────────────────
function findIncidentMatch(decision, incidents, carMap) {
  if (!decision.carNumber) return null;

  const carInfo = carMap.get(decision.carNumber);
  if (!carInfo) return null;

  // Match by: driver + session + penalty points
  const candidates = incidents.filter((inc) => {
    if (inc.driverId !== carInfo.driverId) return false;
    if (decision.session && inc.session !== decision.session) return false;
    if (decision.penalties.penaltyPoints !== inc.decision.penaltyPoints) return false;
    return true;
  });

  if (candidates.length === 1) return candidates[0];

  // If multiple candidates, try to narrow by matching description keywords
  if (candidates.length > 1 && decision.fact) {
    const factWords = decision.fact.toLowerCase();
    const scored = candidates.map((c) => {
      const descWords = c.incidentDescription.toLowerCase();
      let score = 0;
      if (factWords.includes("collision") && descWords.includes("collision")) score++;
      if (factWords.includes("forcing") && descWords.includes("forc")) score++;
      if (factWords.includes("impeding") && descWords.includes("imped")) score++;
      return { incident: c, score };
    });
    scored.sort((a, b) => b.score - a.score);
    if (scored[0].score > scored[1]?.score) return scored[0].incident;
  }

  return null;
}

// ── Sync: fetch new FIA docs for current event and add to fia-decisions.json ─
async function syncCurrentEvent(fiaData, season) {
  let events;
  try {
    events = await fetchEventIds(season);
  } catch (err) {
    console.error(`⚠ Could not fetch ${season} events: ${err.message}`);
    return 0;
  }

  const existingUrls = new Set(fiaData.decisions.map((d) => d.pdfUrl));
  let newCount = 0;

  // Process all events for the season (the scraper caches, so only new ones hit the network)
  for (const [eventName, eventId] of Object.entries(events)) {
    if (/test|pre-?season/i.test(eventName)) continue;

    let docs;
    try {
      docs = await fetchEventDocumentsByEventId(eventId, eventName);
    } catch {
      continue;
    }

    // Only process docs not already in the dataset
    const newDocs = docs.filter((d) => !existingUrls.has(d.pdfUrl));
    if (newDocs.length === 0) continue;

    console.log(`  Syncing ${eventName}: ${newDocs.length} new docs`);

    for (const doc of newDocs) {
      let parsed;
      try {
        const buffer = await downloadPdf(doc.pdfUrl);
        parsed = await parseFiaDecisionPdf(buffer);
      } catch (err) {
        console.error(`    ⚠ Parse failed: ${doc.title} — ${err.message}`);
        continue;
      }

      fiaData.decisions.push({
        id: `FIA-${season}-${eventId}-${doc.docNumber || "x"}`,
        season,
        round: null, // Could resolve from calendar but not critical for sync
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
      });

      existingUrls.add(doc.pdfUrl);
      newCount++;
    }
  }

  return newCount;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const writeMode = process.argv.includes("--write");
  const allMode = process.argv.includes("--all");
  const syncMode = process.argv.includes("--sync");
  const raceIdx = process.argv.indexOf("--race");
  const targetRace = raceIdx !== -1 ? process.argv[raceIdx + 1] : null;

  const ppData = JSON.parse(readFileSync(PP_PATH, "utf-8"));

  // Load FIA decisions data
  let fiaData;
  if (existsSync(FIA_PATH)) {
    fiaData = JSON.parse(readFileSync(FIA_PATH, "utf-8"));
  } else {
    fiaData = { lastUpdated: null, decisions: [] };
  }

  // Phase 1: Sync new FIA docs if requested
  if (syncMode) {
    const currentYear = new Date().getFullYear();
    console.log(`Syncing FIA documents for ${currentYear}...\n`);
    const newDocs = await syncCurrentEvent(fiaData, currentYear);
    if (newDocs > 0) {
      console.log(`\n  Added ${newDocs} new FIA decisions\n`);
      if (writeMode) {
        fiaData.lastUpdated = new Date().toISOString().slice(0, 10);
        writeFileSync(FIA_PATH, JSON.stringify(fiaData, null, 2) + "\n");
      }
    } else {
      console.log("  No new FIA documents found\n");
    }
  }

  // Phase 2: Enrich LP incidents from fia-decisions.json
  const lpIncidents = ppData.incidents.filter(
    (inc) => inc.document && inc.document.match(/^DOC-\d+-LP$/),
  );

  if (lpIncidents.length === 0) {
    console.log("✓ No Liquipedia-sourced incidents needing enrichment.");
    return;
  }

  // Group by race
  const byRace = new Map();
  for (const inc of lpIncidents) {
    const key = `${inc.season}|${inc.raceName}`;
    if (!byRace.has(key)) byRace.set(key, []);
    byRace.get(key).push(inc);
  }

  console.log(`Found ${lpIncidents.length} LP-sourced incidents across ${byRace.size} races\n`);

  // Filter target races
  let targetRaces = [...byRace.keys()];
  if (targetRace) {
    targetRaces = targetRaces.filter((k) =>
      k.toLowerCase().includes(targetRace.toLowerCase()),
    );
  } else if (!allMode) {
    targetRaces.sort();
    targetRaces = [targetRaces[targetRaces.length - 1]];
  }

  let totalEnriched = 0;
  let totalFailed = 0;

  for (const raceKey of targetRaces) {
    const [seasonStr, raceName] = raceKey.split("|");
    const season = parseInt(seasonStr);
    const raceIncidents = byRace.get(raceKey);
    const carMap = buildCarNumberMap(season);

    console.log(`── ${raceName} (${season}) — ${raceIncidents.length} LP incidents ──`);

    // Find FIA decisions for this race from fia-decisions.json
    const raceDecisions = fiaData.decisions.filter(
      (d) =>
        d.season === season &&
        d.raceName.toLowerCase().includes(raceName.toLowerCase().replace(/ grand prix$/i, "")) &&
        !d.noFurtherAction &&
        d.penalties.penaltyPoints > 0,
    );

    if (raceDecisions.length === 0) {
      console.log("  No matching FIA decisions found in dataset.");
      totalFailed += raceIncidents.length;
      continue;
    }

    console.log(`  Found ${raceDecisions.length} penalty-point decisions in dataset`);

    // Match decisions to incidents
    const matched = new Set();
    for (const decision of raceDecisions) {
      const incident = findIncidentMatch(decision, raceIncidents, carMap);

      if (incident && !matched.has(incident.id)) {
        matched.add(incident.id);

        const fiaDocRef = decision.docNumber
          ? `DOC-${season}-${String(decision.docNumber).padStart(3, "0")}`
          : incident.document;

        const updates = {
          timePenalty: decision.penalties.timePenalty ?? incident.decision.timePenalty,
          gridPenalty: decision.penalties.gridPenalty ?? incident.decision.gridPenalty,
          driveThrough: decision.penalties.driveThrough || incident.decision.driveThrough,
          reprimand: decision.penalties.reprimand || incident.decision.reprimand,
          disqualified: decision.penalties.disqualified || incident.decision.disqualified,
          fine: decision.penalties.fine ?? incident.decision.fine,
        };

        console.log(
          `  ✓ ${incident.driverId} (${incident.session}): ${incident.decision.penaltyPoints}pts → enriched from Doc ${decision.docNumber}`,
        );

        if (writeMode) {
          const idx = ppData.incidents.findIndex((i) => i.id === incident.id);
          if (idx !== -1) {
            Object.assign(ppData.incidents[idx].decision, updates);
            ppData.incidents[idx].document = fiaDocRef;
          }
        }
        totalEnriched++;
      }
    }

    const unmatched = raceIncidents.filter((i) => !matched.has(i.id));
    if (unmatched.length > 0) {
      console.log(`  ⚠ ${unmatched.length} LP incidents could not be matched:`);
      for (const i of unmatched) {
        console.log(`    - ${i.driverId} (${i.session}): ${i.decision.penaltyPoints}pts`);
      }
      totalFailed += unmatched.length;
    }

    console.log();
  }

  // Summary
  console.log("── Summary ──");
  console.log(`  Enriched: ${totalEnriched}`);
  console.log(`  Unmatched LP: ${totalFailed}`);

  if (writeMode && totalEnriched > 0) {
    ppData.lastUpdated = new Date().toISOString().slice(0, 10);
    writeFileSync(PP_PATH, JSON.stringify(ppData, null, 2) + "\n");
    console.log(`\n✓ Updated ${totalEnriched} incidents in ${PP_PATH}`);
  } else if (totalEnriched > 0) {
    console.log(`\nRun with --write to save enrichment changes.`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
