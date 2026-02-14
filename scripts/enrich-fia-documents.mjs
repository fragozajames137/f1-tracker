#!/usr/bin/env node

/**
 * Enriches penalty-points.json with full penalty details from FIA stewards
 * decision PDFs. Targets incidents sourced from Liquipedia (document = "DOC-*-LP").
 *
 * Usage:
 *   node scripts/enrich-fia-documents.mjs                          # dry-run
 *   node scripts/enrich-fia-documents.mjs --write                   # writes changes
 *   node scripts/enrich-fia-documents.mjs --race "Abu Dhabi Grand Prix"
 *   node scripts/enrich-fia-documents.mjs --all                     # all LP incidents
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { fetchEventDocuments, downloadPdf } from "./lib/fia-scraper.mjs";
import { parseFiaDecisionPdf } from "./lib/fia-pdf-parser.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "app", "data", "penalty-points.json");
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

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const writeMode = process.argv.includes("--write");
  const allMode = process.argv.includes("--all");
  const raceIdx = process.argv.indexOf("--race");
  const targetRace = raceIdx !== -1 ? process.argv[raceIdx + 1] : null;

  const data = JSON.parse(readFileSync(DATA_PATH, "utf-8"));

  // Find incidents needing enrichment (Liquipedia-sourced)
  const lpIncidents = data.incidents.filter((inc) =>
    inc.document && inc.document.match(/^DOC-\d+-LP$/),
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

  // Filter to target races
  let targetRaces = [...byRace.keys()];
  if (targetRace) {
    targetRaces = targetRaces.filter((k) =>
      k.toLowerCase().includes(targetRace.toLowerCase()),
    );
    if (targetRaces.length === 0) {
      console.log(`No LP incidents found for race matching "${targetRace}"`);
      return;
    }
  } else if (!allMode) {
    // Default: only process the most recent race
    targetRaces.sort();
    targetRaces = [targetRaces[targetRaces.length - 1]];
  }

  let totalEnriched = 0;
  let totalFailed = 0;
  let totalNew = 0;

  for (const raceKey of targetRaces) {
    const [seasonStr, raceName] = raceKey.split("|");
    const season = parseInt(seasonStr);
    const raceIncidents = byRace.get(raceKey);
    const carMap = buildCarNumberMap(season);

    console.log(`── ${raceName} (${season}) — ${raceIncidents.length} LP incidents ──`);

    // Fetch FIA documents for this event
    let fiaDocs;
    try {
      fiaDocs = await fetchEventDocuments(raceName, season);
    } catch (err) {
      console.log(`  ⚠ Could not fetch FIA documents: ${err.message}`);
      continue;
    }

    if (fiaDocs.length === 0) {
      console.log("  No FIA decision documents found for this event.");
      continue;
    }

    console.log(`  Found ${fiaDocs.length} FIA decision documents`);

    // Download and parse each PDF
    const parsedDecisions = [];
    for (const doc of fiaDocs) {
      try {
        const buffer = await downloadPdf(doc.pdfUrl);
        const parsed = await parseFiaDecisionPdf(buffer);
        parsed._doc = doc; // keep reference
        parsedDecisions.push(parsed);
      } catch (err) {
        console.log(`  ⚠ Failed to parse ${doc.title}: ${err.message}`);
      }
    }

    console.log(`  Parsed ${parsedDecisions.length} decisions`);

    // Filter to decisions with actual penalties (not "no further action")
    const penaltyDecisions = parsedDecisions.filter(
      (d) => !d.noFurtherAction && d.penalties.penaltyPoints > 0,
    );

    // Match FIA decisions to existing LP incidents
    const matched = new Set();
    for (const decision of penaltyDecisions) {
      const incident = findIncidentMatch(decision, raceIncidents, carMap);

      if (incident && !matched.has(incident.id)) {
        matched.add(incident.id);

        // Update the incident's decision fields
        const fiaDocRef = decision._doc.docNumber
          ? `DOC-${season}-${String(decision._doc.docNumber).padStart(3, "0")}`
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
          `  ✓ ${incident.driverId} (${incident.session}): ${incident.decision.penaltyPoints}pts → enriched from Doc ${decision._doc.docNumber}`,
        );

        if (updates.timePenalty) console.log(`    + time penalty: ${updates.timePenalty}s`);
        if (updates.gridPenalty) console.log(`    + grid penalty: ${updates.gridPenalty} places`);
        if (updates.driveThrough) console.log(`    + drive-through penalty`);
        if (updates.reprimand) console.log(`    + reprimand`);
        if (updates.fine) console.log(`    + fine: ${updates.fine}`);

        if (writeMode) {
          // Find and update the incident in the main data array
          const idx = data.incidents.findIndex((i) => i.id === incident.id);
          if (idx !== -1) {
            Object.assign(data.incidents[idx].decision, updates);
            data.incidents[idx].document = fiaDocRef;
          }
        }
        totalEnriched++;
      }
    }

    // Report unmatched LP incidents
    const unmatched = raceIncidents.filter((i) => !matched.has(i.id));
    if (unmatched.length > 0) {
      console.log(`  ⚠ ${unmatched.length} LP incidents could not be matched:`);
      for (const i of unmatched) {
        console.log(`    - ${i.driverId} (${i.session}): ${i.decision.penaltyPoints}pts`);
      }
      totalFailed += unmatched.length;
    }

    // Report FIA decisions with penalty points that don't match any LP incident
    const unmatchedFia = penaltyDecisions.filter((d) => {
      const carInfo = carMap.get(d.carNumber);
      if (!carInfo) return true;
      return !raceIncidents.some(
        (i) =>
          i.driverId === carInfo.driverId &&
          i.decision.penaltyPoints === d.penalties.penaltyPoints,
      );
    });
    if (unmatchedFia.length > 0) {
      console.log(`  ✚ ${unmatchedFia.length} FIA decisions not in existing data:`);
      for (const d of unmatchedFia) {
        console.log(
          `    - Car ${d.carNumber} (${d.session}): ${d.penalties.penaltyPoints}pts — ${d.fact?.slice(0, 80) || "unknown"}`,
        );
      }
      totalNew += unmatchedFia.length;
    }

    console.log();
  }

  // Summary
  console.log("── Summary ──");
  console.log(`  Enriched: ${totalEnriched}`);
  console.log(`  Unmatched LP: ${totalFailed}`);
  console.log(`  New FIA decisions: ${totalNew}`);

  if (writeMode && totalEnriched > 0) {
    data.lastUpdated = new Date().toISOString().slice(0, 10);
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n");
    console.log(`\n✓ Updated ${totalEnriched} incidents in ${DATA_PATH}`);
  } else if (totalEnriched > 0) {
    console.log(`\nRun with --write to save enrichment changes.`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
