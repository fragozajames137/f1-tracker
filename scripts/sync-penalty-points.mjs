#!/usr/bin/env node

/**
 * Syncs penalty points data from Liquipedia's Penalty_Points page
 * into app/data/penalty-points.json.
 *
 * Usage:
 *   node scripts/sync-penalty-points.mjs          # dry-run (shows diff)
 *   node scripts/sync-penalty-points.mjs --write   # writes changes to file
 */

import { load } from "cheerio";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { GP_CALENDAR_2025, getGpCalendar } from "./lib/race-calendar.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "app", "data", "penalty-points.json");
const GRID_PATH = join(__dirname, "..", "app", "data", "grid-2026.json");

const LIQUIPEDIA_URL = "https://liquipedia.net/formula1/Penalty_Points";

// ── Driver name → ID mapping ────────────────────────────────────────────────
// Build from grid data + known 2025 drivers not on 2026 grid
function buildDriverMap() {
  const grid = JSON.parse(readFileSync(GRID_PATH, "utf-8"));
  const map = new Map();

  for (const team of grid.teams) {
    for (const seat of [team.seat1, team.seat2]) {
      map.set(normalizeName(seat.name), { id: seat.id, teamId: team.id });
    }
    // Also check reserve drivers for drivers who raced in 2025
    for (const reserve of team.reserveDrivers || []) {
      const key = normalizeName(reserve.name);
      if (!map.has(key)) {
        map.set(key, { id: slugify(reserve.name), teamId: team.id });
      }
    }
  }

  // Name aliases (Liquipedia uses full names, grid may use short names)
  const aliases = {
    "alexander albon": "alex albon",
    "nico hulkenberg": "nico hulkenberg", // handles Hülkenberg accent stripping
  };
  for (const [alias, canonical] of Object.entries(aliases)) {
    if (map.has(canonical) && !map.has(alias)) {
      map.set(alias, map.get(canonical));
    }
  }

  // Manual overrides for known 2025 driver → team mappings
  // (drivers who switched teams mid-season or are no longer on grid)
  const overrides = {
    "yuki tsunoda": { id: "yuki-tsunoda", teamId2025: "racing-bulls" },
    "jack doohan": { id: "jack-doohan", teamId2025: "alpine" },
    "isack hadjar": { id: "isack-hadjar", teamId2025: "racing-bulls" },
  };
  for (const [name, info] of Object.entries(overrides)) {
    if (info.teamId2025) {
      map.set(name, { id: info.id, teamId: info.teamId2025 });
    }
  }

  return map;
}

function normalizeName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .trim();
}

function slugify(name) {
  return normalizeName(name).replace(/\s+/g, "-");
}

// GP_CALENDAR_2025 imported from ./lib/race-calendar.mjs

// ── Incident type classification from reason text ───────────────────────────
function classifyIncident(reason) {
  const r = reason.toLowerCase();
  if (r.includes("causing a collision") || r.includes("collision with")) return "causing-collision";
  if (r.includes("forcing") && r.includes("off")) return "forcing-off-track";
  if (r.includes("forcing") && r.includes("onto")) return "forcing-off-track";
  if (r.includes("impeding")) return "impeding";
  if (r.includes("track limit")) return "track-limits";
  if (r.includes("unsafe release")) return "unsafe-release";
  if (r.includes("speeding") && r.includes("pit")) return "speeding-pit-lane";
  if (r.includes("false start")) return "false-start";
  if (r.includes("dangerous driving") || r.includes("erratic")) return "dangerous-driving";
  if (r.includes("safety car")) return "safety-car-infringement";
  if (r.includes("red flag")) return "red-flag-infringement";
  if (r.includes("pit entry") || r.includes("failure to comply")) return "pit-entry-infringement";
  if (r.includes("technical")) return "technical-violation";
  if (r.includes("change of") && r.includes("direction")) return "change-of-direction";
  if (r.includes("change of position") || r.includes("more than one change")) return "change-of-direction";
  if (r.includes("overtaking") && r.includes("red flag")) return "red-flag-infringement";
  if (r.includes("yellow flag") || r.includes("slow under yellow")) return "safety-car-infringement";
  if (r.includes("braking") && (r.includes("erratic") || r.includes("safety car"))) return "safety-car-infringement";
  // Default
  return "dangerous-driving";
}

// ── Session extraction from reason text ─────────────────────────────────────
function extractSession(reason) {
  const r = reason.trim();
  // Check for explicit session markers in parentheses at end
  const parenMatch = r.match(/\((FP[123]|Sprint|Qualifying|Sprint Qualifying|Pre-Race)\)\s*$/i);
  if (parenMatch) {
    const s = parenMatch[1];
    if (/^fp1$/i.test(s)) return "FP1";
    if (/^fp2$/i.test(s)) return "FP2";
    if (/^fp3$/i.test(s)) return "FP3";
    if (/^sprint qualifying$/i.test(s)) return "Sprint Qualifying";
    if (/^sprint$/i.test(s)) return "Sprint";
    if (/^qualifying$/i.test(s)) return "Qualifying";
    if (/^pre-race$/i.test(s)) return "Pre-Race";
  }
  return "Race";
}

// ── Parse Liquipedia HTML ───────────────────────────────────────────────────
function parseTables(html) {
  const $ = load(html);
  const tables = $("table.wikitable");
  const allIncidents = [];

  tables.each((_ti, table) => {
    let currentDriver = null;
    let currentTotal = null;

    $(table)
      .find("tr")
      .slice(1)
      .each((_ri, row) => {
        const cells = [];
        $(row)
          .find("td, th")
          .each((_, cell) => {
            cells.push({
              text: $(cell).text().trim(),
              rowspan: parseInt($(cell).attr("rowspan") || "1"),
            });
          });

        let points, expiry, gp, reason;

        if (cells.length >= 6) {
          // First row for a driver (includes driver name + total)
          currentDriver = cells[0].text;
          currentTotal = parseInt(cells[1].text);
          points = parseInt(cells[2].text);
          expiry = cells[3].text;
          gp = cells[4].text;
          reason = cells[5].text;
        } else if (cells.length === 4) {
          // Continuation row (rowspan on driver/total)
          points = parseInt(cells[0].text);
          expiry = cells[1].text;
          gp = cells[2].text;
          reason = cells[3].text;
        } else {
          return; // skip unexpected row format
        }

        if (!currentDriver || isNaN(points)) return;

        allIncidents.push({
          driver: currentDriver,
          totalPoints: currentTotal,
          points,
          expiry,
          gp,
          reason,
        });
      });
  });

  return allIncidents;
}

// ── Convert Liquipedia incident to our format ───────────────────────────────
function convertIncident(raw, driverMap, existingIncidents, nextId) {
  const driverKey = normalizeName(raw.driver);
  const driverInfo = driverMap.get(driverKey);

  if (!driverInfo) {
    console.warn(`  ⚠ Unknown driver: "${raw.driver}"`);
    return null;
  }

  // Parse GP name: "2025 Monaco Grand Prix" → season + raceName
  const gpMatch = raw.gp.match(/^(\d{4})\s+(.+)$/);
  if (!gpMatch) {
    console.warn(`  ⚠ Can't parse GP: "${raw.gp}"`);
    return null;
  }
  const season = parseInt(gpMatch[1]);
  const raceName = gpMatch[2];

  // Look up round/date from calendar
  const calendarKey = season === 2025 ? GP_CALENDAR_2025[raceName] : null;

  // Derive incident date from expiry (expiry - 1 year)
  const expiryDate = new Date(raw.expiry + ", 2026"); // Liquipedia shows "Month Day" format
  // Actually parse the full expiry which includes year
  const expiryParsed = new Date(raw.expiry);
  let incidentDate;
  if (!isNaN(expiryParsed.getTime())) {
    const d = new Date(expiryParsed);
    d.setFullYear(d.getFullYear() - 1);
    incidentDate = d.toISOString().slice(0, 10);
  } else {
    incidentDate = calendarKey?.date ?? "unknown";
  }

  // Use calendar date if available (more precise for race day)
  const date = calendarKey?.date ?? incidentDate;
  const round = calendarKey?.round ?? 0;

  const session = extractSession(raw.reason);
  const incidentType = classifyIncident(raw.reason);

  // Clean up reason text (remove session marker from end for description)
  let description = raw.reason.replace(/\s*\((FP[123]|Sprint|Qualifying|Sprint Qualifying|Pre-Race)\)\s*$/i, "").trim();
  // Remove extra whitespace from scraped text
  description = description.replace(/\s+/g, " ");

  return {
    id: `INC-${season}-${String(nextId).padStart(3, "0")}`,
    driverId: driverInfo.id,
    teamId: driverInfo.teamId,
    round,
    season,
    raceName,
    date,
    session,
    incidentType,
    incidentDescription: description,
    decision: {
      penaltyPoints: raw.points,
      timePenalty: null,
      gridPenalty: null,
      driveThrough: false,
      reprimand: false,
      disqualified: false,
      fine: null,
      other: null,
    },
    document: `DOC-${season}-LP`, // sourced from Liquipedia
  };
}

// ── Match Liquipedia incident to existing data ──────────────────────────────
function findExistingMatch(raw, driverMap, existingIncidents) {
  const driverKey = normalizeName(raw.driver);
  const driverInfo = driverMap.get(driverKey);
  if (!driverInfo) return null;

  const gpMatch = raw.gp.match(/^(\d{4})\s+(.+)$/);
  if (!gpMatch) return null;
  const season = parseInt(gpMatch[1]);
  const raceName = gpMatch[2];
  const session = extractSession(raw.reason);

  // Find matching incidents: same driver, season, race, points, session
  return existingIncidents.find(
    (inc) =>
      inc.driverId === driverInfo.id &&
      inc.season === season &&
      inc.raceName === raceName &&
      inc.decision.penaltyPoints === raw.points &&
      inc.session === session,
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const writeMode = process.argv.includes("--write");

  console.log("Fetching Liquipedia penalty points...");
  const res = await fetch(LIQUIPEDIA_URL, {
    headers: { "User-Agent": "f1-tracker-sync/1.0 (penalty-points)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const html = await res.text();

  const liquipediaIncidents = parseTables(html);
  console.log(`Found ${liquipediaIncidents.length} incidents on Liquipedia\n`);

  const data = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  const driverMap = buildDriverMap();

  // Find the highest existing incident number for ID generation
  let maxId = 0;
  for (const inc of data.incidents) {
    const m = inc.id.match(/INC-\d+-(\d+)/);
    if (m) maxId = Math.max(maxId, parseInt(m[1]));
  }

  const missing = [];
  const matched = [];
  const discrepancies = [];

  for (const raw of liquipediaIncidents) {
    const match = findExistingMatch(raw, driverMap, data.incidents);
    if (match) {
      matched.push({ liquipedia: raw, existing: match });
    } else {
      // Check for partial match (same driver + race but different points/session)
      const driverKey = normalizeName(raw.driver);
      const driverInfo = driverMap.get(driverKey);
      const gpMatch = raw.gp.match(/^(\d{4})\s+(.+)$/);

      if (driverInfo && gpMatch) {
        const season = parseInt(gpMatch[1]);
        const raceName = gpMatch[2];
        const partial = data.incidents.find(
          (inc) =>
            inc.driverId === driverInfo.id &&
            inc.season === season &&
            inc.raceName === raceName &&
            inc.decision.penaltyPoints === raw.points,
        );
        if (partial) {
          discrepancies.push({ liquipedia: raw, existing: partial, reason: "session mismatch" });
          continue;
        }
      }

      missing.push(raw);
    }
  }

  // Report
  console.log(`✓ Matched: ${matched.length} incidents`);

  if (discrepancies.length > 0) {
    console.log(`\n⚠ Discrepancies (${discrepancies.length}):`);
    for (const d of discrepancies) {
      console.log(
        `  ${d.liquipedia.driver} @ ${d.liquipedia.gp}: ${d.reason}`,
      );
      console.log(`    Liquipedia: ${d.liquipedia.points}pts, "${d.liquipedia.reason}"`);
      console.log(`    Existing:   ${d.existing.id}, session=${d.existing.session}`);
    }
  }

  if (missing.length === 0) {
    console.log("\n✓ No missing incidents — data is up to date!");
    return;
  }

  console.log(`\n✚ Missing incidents (${missing.length}):`);
  const newIncidents = [];
  for (const raw of missing) {
    maxId++;
    const incident = convertIncident(raw, driverMap, data.incidents, maxId);
    if (incident) {
      newIncidents.push(incident);
      console.log(
        `  + ${incident.driverId} @ ${incident.raceName} (${incident.session}): ${incident.decision.penaltyPoints}pts — ${incident.incidentDescription}`,
      );
    }
  }

  if (writeMode && newIncidents.length > 0) {
    data.incidents.push(...newIncidents);
    // Sort by date descending, then by id
    data.incidents.sort((a, b) => {
      const dateComp = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateComp !== 0) return dateComp;
      return a.id.localeCompare(b.id);
    });
    data.lastUpdated = new Date().toISOString().slice(0, 10);

    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n");
    console.log(`\n✓ Wrote ${newIncidents.length} new incidents to ${DATA_PATH}`);
  } else if (newIncidents.length > 0) {
    console.log(`\nRun with --write to add these incidents to ${DATA_PATH}`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
