#!/usr/bin/env node
/**
 * Downloads historical driver headshots and team logos from F1's CDN.
 * Uses Jolpica API to discover all drivers/teams per season, then tries
 * multiple CDN URL patterns to grab images.
 */

import { writeFile, mkdir, readdir } from "fs/promises";
import path from "path";

const PROJ = path.resolve(import.meta.dirname, "..");
const DRIVERS_DIR = path.join(PROJ, "public", "drivers");
const LOGOS_DIR = path.join(PROJ, "public", "logos");
const JOLPICA = "https://api.jolpi.ca/ergast/f1";

await mkdir(DRIVERS_DIR, { recursive: true });
await mkdir(LOGOS_DIR, { recursive: true });

// Get existing files so we skip them (accept .webp and .png)
const existingDrivers = new Set(
  (await readdir(DRIVERS_DIR))
    .filter((f) => f.endsWith(".webp") || f.endsWith(".png"))
    .map((f) => f.replace(/\.(webp|png)$/, ""))
);
const existingLogos = new Set(
  (await readdir(LOGOS_DIR))
    .filter((f) => f.endsWith(".webp") || f.endsWith(".svg") || f.endsWith(".png"))
    .map((f) => f.replace(/\.(webp|svg|png)$/, ""))
);

console.log(`Already have ${existingDrivers.size} driver images, ${existingLogos.size} logo images\n`);

// ─── Helpers ───

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/** Strip diacritics/accents from a string (é→e, ü→u, etc.) */
function stripAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function downloadImage(url, dest) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return false;
    const ct = res.headers.get("content-type") || "";
    // Reject HTML responses (error pages)
    if (ct.includes("text/html")) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    // Skip tiny files (likely a fallback/error page or generic silhouette)
    if (buf.length < 2000) return false;
    await writeFile(dest, buf);
    return true;
  } catch {
    return false;
  }
}

/**
 * Build old F1 CDN URLs for a driver (multiple variations).
 * CDN folder letter = first letter of the driver CODE (= first name initial).
 * Tries both old DAM path and Cloudinary-proxied DAM path.
 */
function oldCdnUrls(givenName, familyName) {
  const cleanFirst = stripAccents(givenName);
  const cleanLast = stripAccents(familyName);

  const urls = [];

  // Build code base: first3 of given + first3 of family
  const codeBase = (cleanFirst.slice(0, 3) + cleanLast.slice(0, 3)).toUpperCase();

  // Try suffixes 01 and 02 (02 for drivers sharing a surname, e.g. Schumacher)
  const codeVariations = new Set();
  codeVariations.add(codeBase + "01");
  codeVariations.add(codeBase + "02");

  // For compound last names ("de Vries", "van der Garde"), strip prefix
  const compoundPrefixes = ["de ", "di ", "van ", "da ", "von ", "le ", "la "];
  for (const prefix of compoundPrefixes) {
    if (cleanLast.toLowerCase().startsWith(prefix)) {
      const stripped = cleanLast.slice(prefix.length);
      const alt = (cleanFirst.slice(0, 3) + stripped.slice(0, 3)).toUpperCase();
      codeVariations.add(alt + "01");
    }
  }

  // For apostrophe names (d'Ambrosio), try without
  if (cleanLast.includes("'")) {
    const noapos = cleanLast.replace(/'/g, "");
    const alt = (cleanFirst.slice(0, 3) + noapos.slice(0, 3)).toUpperCase();
    codeVariations.add(alt + "01");
  }

  // CDN folder letter = first letter of code = first letter of given name
  const letter = cleanFirst.charAt(0).toUpperCase();

  for (const code of codeVariations) {
    // Cloudinary-proxied DAM path (confirmed working pattern)
    urls.push(
      `https://media.formula1.com/image/upload/f_auto,c_limit,q_auto,w_1320/content/dam/fom-website/drivers/${letter}/${code}_${cleanFirst}_${cleanLast}/${code.toLowerCase()}.png`
    );
    // Old transform path as fallback
    urls.push(
      `https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/${letter}/${code}_${cleanFirst}_${cleanLast}/${code.toLowerCase()}.png.transform/1col/image.png`
    );
    // Spaces → underscores for compound names
    const underscoreFirst = cleanFirst.replace(/\s+/g, "_");
    const underscoreLast = cleanLast.replace(/\s+/g, "_");
    if (underscoreLast !== cleanLast) {
      urls.push(
        `https://media.formula1.com/image/upload/f_auto,c_limit,q_auto,w_1320/content/dam/fom-website/drivers/${letter}/${code}_${underscoreFirst}_${underscoreLast}/${code.toLowerCase()}.png`
      );
    }
  }

  return urls;
}

/**
 * Build Cloudinary-based URLs for recent drivers (2024+).
 */
function cloudinaryUrls(year, teamSlug, givenName, familyName) {
  const cleanFirst = stripAccents(givenName).toLowerCase();
  const cleanLast = stripAccents(familyName).toLowerCase();
  // Remove spaces/hyphens from names for the code
  const first3 = cleanFirst.replace(/[\s-]/g, "").slice(0, 3);
  const last3 = cleanLast.replace(/[\s-]/g, "").slice(0, 3);
  const code = `${first3}${last3}01`;

  const urls = [];
  for (const y of [year, year - 1]) {
    urls.push(
      `https://media.formula1.com/image/upload/c_thumb,g_face,w_440,h_440/q_auto/d_common:f1:${y}:fallback:driver:${y}fallbackdriverright.webp/v1740000000/common/f1/${y}/${teamSlug}/${code}/${y}${teamSlug}${code}right.webp`
    );
  }
  return urls;
}

// Map Jolpica constructor IDs to F1 CDN team slugs
const TEAM_SLUGS = {
  red_bull: "redbullracing",
  mclaren: "mclaren",
  ferrari: "ferrari",
  mercedes: "mercedes",
  aston_martin: "astonmartin",
  alpine: "alpine",
  williams: "williams",
  rb: "racingbulls",
  alphatauri: "alphatauri",
  alfa: "alfaromeo",
  haas: "haasf1team",
  sauber: "sauber",
  renault: "renault",
  racing_point: "racingpoint",
  toro_rosso: "tororosso",
  force_india: "forceindia",
  manor: "manor",
  lotus_f1: "lotus",
};

// ─── Fetch all unique drivers from Jolpica (2010–2025) ───

const START_YEAR = 2010;
const END_YEAR = 2025;
const allDrivers = new Map();

console.log(`=== Fetching driver data from Jolpica (${START_YEAR}–${END_YEAR}) ===\n`);

for (let year = END_YEAR; year >= START_YEAR; year--) {
  process.stdout.write(`  ${year}...`);
  const data = await fetchJSON(`${JOLPICA}/${year}/driverstandings.json`);
  await sleep(300);

  if (!data) { console.log(" (no data)"); continue; }

  const lists = data.MRData?.StandingsTable?.StandingsLists;
  if (!lists || lists.length === 0) { console.log(" (empty)"); continue; }

  const standings = lists[0].DriverStandings;
  let count = 0;
  for (const s of standings) {
    const key = stripAccents(s.Driver.familyName).toLowerCase().replace(/\s+/g, "-");
    if (!allDrivers.has(key)) {
      allDrivers.set(key, {
        givenName: s.Driver.givenName,
        familyName: s.Driver.familyName,
        driverId: s.Driver.driverId,
        code: s.Driver.code,
        constructorId: s.Constructors?.[0]?.constructorId,
        year,
      });
      count++;
    }
  }
  console.log(` ${standings.length} drivers (${count} new)`);
}

console.log(`\nTotal unique drivers: ${allDrivers.size}`);

// ─── Download driver headshots ───

console.log(`\n=== Downloading driver headshots ===\n`);

let downloaded = 0;
let skipped = 0;
let failed = 0;

for (const [key, d] of allDrivers) {
  if (existingDrivers.has(key)) {
    skipped++;
    continue;
  }

  process.stdout.write(`  ${d.givenName} ${d.familyName}...`);

  // Try old CDN URLs (multiple variations)
  const oldUrls = oldCdnUrls(d.givenName, d.familyName);
  let ok = false;

  for (const url of oldUrls) {
    const destPng = path.join(DRIVERS_DIR, `${key}.png`);
    ok = await downloadImage(url, destPng);
    if (ok) {
      downloaded++;
      console.log(" OK (old CDN)");
      break;
    }
    await sleep(100);
  }

  if (ok) { await sleep(200); continue; }

  // Try Cloudinary URLs for any year with a known team slug
  const teamSlug = TEAM_SLUGS[d.constructorId] ?? d.constructorId?.replace(/_/g, "");
  if (teamSlug) {
    const cloudUrls = cloudinaryUrls(d.year, teamSlug, d.givenName, d.familyName);
    for (const url of cloudUrls) {
      const dest = path.join(DRIVERS_DIR, `${key}.webp`);
      ok = await downloadImage(url, dest);
      if (ok) {
        downloaded++;
        console.log(" OK (cloudinary)");
        break;
      }
      await sleep(100);
    }
  }

  if (!ok) {
    failed++;
    console.log(" MISS");
  }
  await sleep(200);
}

console.log(`\nDrivers: ${downloaded} downloaded, ${skipped} already had, ${failed} not found`);

// ─── Fetch unique constructors and download logos ───

console.log(`\n=== Fetching constructor data ===\n`);

const allConstructors = new Map();

for (let year = END_YEAR; year >= START_YEAR; year--) {
  const data = await fetchJSON(`${JOLPICA}/${year}/constructorstandings.json`);
  await sleep(300);

  if (!data) continue;
  const lists = data.MRData?.StandingsTable?.StandingsLists;
  if (!lists || lists.length === 0) continue;

  for (const s of lists[0].ConstructorStandings) {
    const id = s.Constructor.constructorId;
    const key = id.replace(/_/g, "-");
    if (!allConstructors.has(key)) {
      allConstructors.set(key, {
        constructorId: id,
        name: s.Constructor.name,
        year,
      });
    }
  }
}

console.log(`Total unique constructors: ${allConstructors.size}`);

// Download logos
console.log(`\n=== Downloading team logos ===\n`);

let logoDownloaded = 0;
let logoSkipped = 0;
let logoFailed = 0;

for (const [key, c] of allConstructors) {
  if (existingLogos.has(key)) {
    logoSkipped++;
    continue;
  }

  const slug = TEAM_SLUGS[c.constructorId] ?? c.constructorId.replace(/_/g, "");
  const urls = [
    `https://media.formula1.com/content/dam/fom-website/teams/2024/${slug}-logo.png.transform/2col/image.png`,
    `https://media.formula1.com/content/dam/fom-website/teams/2023/${slug}-logo.png.transform/2col/image.png`,
    `https://media.formula1.com/image/upload/c_fit,h_64/q_auto/v1740000000/common/f1/2025/${slug}/2025${slug}logowhite.webp`,
    `https://media.formula1.com/image/upload/c_fit,h_64/q_auto/v1740000000/common/f1/2024/${slug}/2024${slug}logowhite.webp`,
    // Try the team name directly for older CDN
    `https://media.formula1.com/content/dam/fom-website/teams/2022/${slug}-logo.png.transform/2col/image.png`,
    `https://media.formula1.com/content/dam/fom-website/teams/2021/${slug}-logo.png.transform/2col/image.png`,
  ];

  process.stdout.write(`  ${c.name} (${key})...`);

  let ok = false;
  for (const url of urls) {
    const ext = url.endsWith(".webp") ? ".webp" : ".png";
    ok = await downloadImage(url, path.join(LOGOS_DIR, `${key}${ext}`));
    if (ok) break;
    await sleep(100);
  }

  if (ok) {
    logoDownloaded++;
    console.log(" OK");
  } else {
    logoFailed++;
    console.log(" MISS");
  }
  await sleep(200);
}

console.log(`\nLogos: ${logoDownloaded} downloaded, ${logoSkipped} already had, ${logoFailed} not found`);

// ─── Summary ───

const finalDrivers = (await readdir(DRIVERS_DIR)).filter((f) => f.endsWith(".webp") || f.endsWith(".png"));
const finalLogos = (await readdir(LOGOS_DIR)).filter((f) => f.endsWith(".webp") || f.endsWith(".svg") || f.endsWith(".png"));

console.log(`\n=== FINAL TOTALS ===`);
console.log(`Driver images: ${finalDrivers.length}`);
console.log(`Team logos: ${finalLogos.length}`);
