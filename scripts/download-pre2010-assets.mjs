/**
 * Download pre-2010 driver headshots and constructor logos from Wikipedia.
 *
 * Reads audit-results.json for the list of missing drivers/constructors,
 * then attempts to fetch images from Wikipedia REST API.
 *
 * Usage: node scripts/download-pre2010-assets.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const AUDIT_PATH = new URL("./audit-results.json", import.meta.url);
const DRIVERS_DIR = new URL("../public/drivers/", import.meta.url).pathname;
const LOGOS_DIR = new URL("../public/logos/", import.meta.url).pathname;

const DELAY = 300; // ms between Wikipedia requests
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Check if we already have a file (any extension)
function hasFile(dir, baseName, exts = [".webp", ".png", ".jpg", ".svg"]) {
  return exts.some((ext) => fs.existsSync(path.join(dir, baseName + ext)));
}

async function downloadImage(url, destPath) {
  const res = await fetch(url, {
    headers: { "User-Agent": "F1TrackerBot/1.0 (educational project)" },
  });
  if (!res.ok) return false;
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) return false;
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(destPath));
  return true;
}

async function getWikipediaImage(articleTitle) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(articleTitle)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "F1TrackerBot/1.0 (educational project)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Prefer originalimage, fall back to thumbnail
    const imgUrl = data.originalimage?.source || data.thumbnail?.source;
    return imgUrl || null;
  } catch {
    return null;
  }
}

async function main() {
  if (!fs.existsSync(AUDIT_PATH)) {
    console.error("Run audit-all-seasons.mjs first to generate audit-results.json");
    process.exit(1);
  }

  const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, "utf-8"));

  // --- Download driver headshots ---
  console.log(`\n=== Driver Headshots ===`);
  console.log(`Total missing drivers: ${audit.missingDrivers.length}`);

  let driverDownloaded = 0;
  let driverSkipped = 0;
  let driverFailed = 0;

  for (const d of audit.missingDrivers) {
    const key = d.key;
    if (hasFile(DRIVERS_DIR, key)) {
      driverSkipped++;
      continue;
    }

    const articleTitle = `${d.givenName} ${d.familyName}`;
    process.stdout.write(`\r  [${driverDownloaded + driverSkipped + driverFailed + 1}/${audit.missingDrivers.length}] ${articleTitle}...                    `);

    const imgUrl = await getWikipediaImage(articleTitle);
    await sleep(DELAY);

    if (!imgUrl) {
      driverFailed++;
      continue;
    }

    // Determine extension from URL
    const urlPath = new URL(imgUrl).pathname;
    let ext = path.extname(urlPath).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) ext = ".png";
    if (ext === ".jpeg") ext = ".jpg";

    const destPath = path.join(DRIVERS_DIR, key + ext);
    try {
      const ok = await downloadImage(imgUrl, destPath);
      if (ok) {
        // Verify file size is reasonable (>1KB, <10MB)
        const stat = fs.statSync(destPath);
        if (stat.size < 1024 || stat.size > 10_000_000) {
          fs.unlinkSync(destPath);
          driverFailed++;
        } else {
          driverDownloaded++;
        }
      } else {
        driverFailed++;
      }
    } catch {
      driverFailed++;
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
    }

    await sleep(DELAY);
  }

  console.log(`\n  Downloaded: ${driverDownloaded}, Skipped (already exist): ${driverSkipped}, Failed/No image: ${driverFailed}`);

  // --- Download constructor logos ---
  console.log(`\n=== Constructor Logos ===`);
  console.log(`Total missing constructors: ${audit.missingConstructors.length}`);

  let logoDownloaded = 0;
  let logoSkipped = 0;
  let logoFailed = 0;

  for (const c of audit.missingConstructors) {
    const fileKey = c.mapped;
    if (hasFile(LOGOS_DIR, fileKey)) {
      logoSkipped++;
      continue;
    }

    // Try Wikipedia article for the constructor
    // Common naming: "{name} (Formula One)" or just "{name}"
    const candidates = [
      `${c.name} (Formula One team)`,
      `${c.name} (Formula One)`,
      c.name,
    ];

    process.stdout.write(`\r  [${logoDownloaded + logoSkipped + logoFailed + 1}/${audit.missingConstructors.length}] ${c.name}...                    `);

    let found = false;
    for (const candidate of candidates) {
      const imgUrl = await getWikipediaImage(candidate);
      await sleep(DELAY);

      if (!imgUrl) continue;

      const urlPath = new URL(imgUrl).pathname;
      let ext = path.extname(urlPath).toLowerCase();
      if (![".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(ext)) ext = ".png";
      if (ext === ".jpeg") ext = ".jpg";

      const destPath = path.join(LOGOS_DIR, fileKey + ext);
      try {
        const ok = await downloadImage(imgUrl, destPath);
        if (ok) {
          const stat = fs.statSync(destPath);
          if (stat.size < 512 || stat.size > 10_000_000) {
            fs.unlinkSync(destPath);
          } else {
            logoDownloaded++;
            found = true;
            break;
          }
        }
      } catch {
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      }
    }

    if (!found) logoFailed++;
    await sleep(DELAY);
  }

  console.log(`\n  Downloaded: ${logoDownloaded}, Skipped (already exist): ${logoSkipped}, Failed/No image: ${logoFailed}`);
  console.log("\nDone!");
}

main().catch(console.error);
