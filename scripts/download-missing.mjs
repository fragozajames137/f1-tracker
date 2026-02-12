#!/usr/bin/env node
/**
 * Downloads missing driver headshots (via Wikipedia) and team logos
 * (via F1 CDN → Wikipedia fallback) for the history page.
 */

import { writeFile, mkdir, readdir } from "fs/promises";
import path from "path";

const PROJ = path.resolve(import.meta.dirname, "..");
const DRIVERS_DIR = path.join(PROJ, "public", "drivers");
const LOGOS_DIR = path.join(PROJ, "public", "logos");

await mkdir(DRIVERS_DIR, { recursive: true });
await mkdir(LOGOS_DIR, { recursive: true });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function stripAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const existingDrivers = new Set(
  (await readdir(DRIVERS_DIR))
    .filter(f => f.endsWith(".webp") || f.endsWith(".png"))
    .map(f => f.replace(/\.(webp|png)$/, ""))
);

const existingLogos = new Set(
  (await readdir(LOGOS_DIR))
    .filter(f => f.endsWith(".webp") || f.endsWith(".png") || f.endsWith(".svg"))
    .map(f => f.replace(/\.(webp|png|svg)$/, ""))
);

// ─── Download helper ───

async function downloadImage(url, dest, minSize = 2000) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return false;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("text/html")) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < minSize) return false;
    await writeFile(dest, buf);
    return true;
  } catch {
    return false;
  }
}

// ─── Wikipedia image fetcher ───

async function getWikipediaImage(articleTitle) {
  // Use REST API summary endpoint — returns thumbnail
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(articleTitle)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    // Prefer originalimage for higher quality, fall back to thumbnail
    return data.originalimage?.source || data.thumbnail?.source || null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════
// PART 1: TEAM LOGOS
// ═══════════════════════════════════════════════════

console.log("=== TEAM LOGOS ===\n");

// Teams that need logos — Jolpica ID → { name, slug (for F1 CDN), wikiTitle, years[] }
const MISSING_TEAMS = [
  { id: "rb", fileKey: "rb", name: "RB F1 Team", slugs: ["racingbulls", "rb"], wikiTitle: "RB F1 Team", years: [2024, 2025] },
  { id: "alfa", fileKey: "alfa-romeo", name: "Alfa Romeo", slugs: ["alfaromeo", "alfa-romeo-racing", "alfaromeoracing"], wikiTitle: "Alfa Romeo in Formula One", years: [2019, 2020, 2021, 2022, 2023] },
  { id: "sauber", fileKey: "sauber", name: "Sauber", slugs: ["sauber"], wikiTitle: "Sauber Motorsport", years: [2010, 2018, 2024] },
  { id: "racing_point", fileKey: "racing-point", name: "Racing Point", slugs: ["racingpoint"], wikiTitle: "Racing Point F1 Team", years: [2019, 2020] },
  { id: "toro_rosso", fileKey: "toro-rosso", name: "Toro Rosso", slugs: ["tororosso"], wikiTitle: "Scuderia Toro Rosso", years: [2010, 2019] },
  { id: "force_india", fileKey: "force-india", name: "Force India", slugs: ["forceindia"], wikiTitle: "Force India", years: [2010, 2018] },
  { id: "lotus_f1", fileKey: "lotus-f1", name: "Lotus F1", slugs: ["lotus"], wikiTitle: "Lotus F1 Team", years: [2012, 2015] },
  { id: "manor", fileKey: "manor", name: "Manor Marussia", slugs: ["manor", "manormarussia"], wikiTitle: "Manor Racing", years: [2015, 2016] },
  { id: "marussia", fileKey: "marussia", name: "Marussia", slugs: ["marussia"], wikiTitle: "Marussia F1 Team", years: [2012, 2014] },
  { id: "caterham", fileKey: "caterham", name: "Caterham", slugs: ["caterham"], wikiTitle: "Caterham F1 Team", years: [2012, 2014] },
  { id: "hrt", fileKey: "hrt", name: "HRT", slugs: ["hrt", "hispania"], wikiTitle: "HRT Formula 1 Team", years: [2010, 2012] },
  { id: "lotus_racing", fileKey: "lotus-racing", name: "Lotus Racing", slugs: ["lotusracing", "lotus"], wikiTitle: "Team Lotus (2010–11)", years: [2010, 2011] },
  { id: "virgin", fileKey: "virgin", name: "Virgin Racing", slugs: ["virgin", "marussia"], wikiTitle: "Virgin Racing", years: [2010, 2011] },
];

let logoDownloaded = 0;
let logoFailed = 0;

for (const team of MISSING_TEAMS) {
  if (existingLogos.has(team.fileKey)) {
    console.log(`  ${team.name} — already have`);
    continue;
  }

  process.stdout.write(`  ${team.name}...`);
  let ok = false;

  // Strategy 1: Try F1 CDN with various year/slug combos
  for (const slug of team.slugs) {
    for (const year of team.years) {
      const urls = [
        // Cloudinary white logo
        `https://media.formula1.com/image/upload/c_fit,h_64/q_auto/v1740000000/common/f1/${year}/${slug}/${year}${slug}logowhite.webp`,
        // Old DAM path
        `https://media.formula1.com/content/dam/fom-website/teams/${year}/${slug}-logo.png.transform/2col/image.png`,
        // Cloudinary-proxied DAM
        `https://media.formula1.com/image/upload/f_auto,c_limit,q_auto,w_320/content/dam/fom-website/teams/${year}/${slug}-logo.png`,
      ];
      for (const url of urls) {
        const ext = url.endsWith(".webp") ? ".webp" : ".png";
        ok = await downloadImage(url, path.join(LOGOS_DIR, `${team.fileKey}${ext}`));
        if (ok) break;
        await sleep(50);
      }
      if (ok) break;
    }
    if (ok) break;
  }

  if (ok) {
    logoDownloaded++;
    console.log(" OK (F1 CDN)");
    await sleep(150);
    continue;
  }

  // Strategy 2: Try Wikipedia
  const wikiImg = await getWikipediaImage(team.wikiTitle);
  if (wikiImg) {
    const ext = wikiImg.includes(".svg") ? ".svg" : ".png";
    ok = await downloadImage(wikiImg, path.join(LOGOS_DIR, `${team.fileKey}${ext}`), 500);
    if (ok) {
      logoDownloaded++;
      console.log(" OK (Wikipedia)");
      await sleep(150);
      continue;
    }
  }

  logoFailed++;
  console.log(" MISS");
  await sleep(150);
}

console.log(`\nLogos: ${logoDownloaded} downloaded, ${logoFailed} not found\n`);

// ═══════════════════════════════════════════════════
// PART 2: DRIVER HEADSHOTS FROM WIKIPEDIA
// ═══════════════════════════════════════════════════

console.log("=== DRIVER HEADSHOTS (Wikipedia) ===\n");

// Missing drivers — key → Wikipedia article title
// Using "DriverName (racing driver)" pattern where needed to disambiguate
const MISSING_DRIVERS = [
  { key: "de-vries", wiki: "Nyck de Vries" },
  { key: "latifi", wiki: "Nicholas Latifi" },
  { key: "massa", wiki: "Felipe Massa" },
  { key: "palmer", wiki: "Jolyon Palmer" },
  { key: "wehrlein", wiki: "Pascal Wehrlein" },
  { key: "button", wiki: "Jenson Button" },
  { key: "di-resta", wiki: "Paul di Resta" },
  { key: "rosberg", wiki: "Nico Rosberg" },
  { key: "nasr", wiki: "Felipe Nasr" },
  { key: "gutierrez", wiki: "Esteban Gutiérrez" },
  { key: "haryanto", wiki: "Rio Haryanto" },
  { key: "maldonado", wiki: "Pastor Maldonado" },
  { key: "merhi", wiki: "Roberto Merhi" },
  { key: "rossi", wiki: "Alexander Rossi" },
  { key: "stevens", wiki: "Will Stevens" },
  { key: "vergne", wiki: "Jean-Éric Vergne" },
  { key: "bianchi", wiki: "Jules Bianchi" },
  { key: "sutil", wiki: "Adrian Sutil" },
  { key: "chilton", wiki: "Max Chilton" },
  { key: "kobayashi", wiki: "Kamui Kobayashi" },
  { key: "lotterer", wiki: "André Lotterer" },
  { key: "webber", wiki: "Mark Webber (racing driver)" },
  { key: "pic", wiki: "Charles Pic" },
  { key: "van-der-garde", wiki: "Giedo van der Garde" },
  { key: "kovalainen", wiki: "Heikki Kovalainen" },
  { key: "senna", wiki: "Bruno Senna" },
  { key: "petrov", wiki: "Vitaly Petrov" },
  { key: "glock", wiki: "Timo Glock" },
  { key: "d'ambrosio", wiki: "Jérôme d'Ambrosio" },
  { key: "karthikeyan", wiki: "Narain Karthikeyan" },
  { key: "de-la-rosa", wiki: "Pedro de la Rosa" },
  { key: "heidfeld", wiki: "Nick Heidfeld" },
  { key: "alguersuari", wiki: "Jaime Alguersuari" },
  { key: "buemi", wiki: "Sébastien Buemi" },
  { key: "barrichello", wiki: "Rubens Barrichello" },
  { key: "trulli", wiki: "Jarno Trulli" },
  { key: "liuzzi", wiki: "Vitantonio Liuzzi" },
  { key: "chandhok", wiki: "Karun Chandhok" },
  { key: "di-grassi", wiki: "Lucas di Grassi" },
  { key: "yamamoto", wiki: "Sakon Yamamoto" },
  { key: "klien", wiki: "Christian Klien" },
];

let driverDownloaded = 0;
let driverFailed = 0;

for (const d of MISSING_DRIVERS) {
  if (existingDrivers.has(d.key)) {
    console.log(`  ${d.wiki} — already have`);
    continue;
  }

  process.stdout.write(`  ${d.wiki}...`);

  const imgUrl = await getWikipediaImage(d.wiki);
  if (imgUrl) {
    // Determine extension from URL
    const ext = imgUrl.match(/\.(jpe?g|png|webp)/i)?.[1]?.toLowerCase() || "png";
    const normalExt = ext === "jpeg" || ext === "jpg" ? "png" : ext;
    const ok = await downloadImage(imgUrl, path.join(DRIVERS_DIR, `${d.key}.${normalExt}`), 2000);
    if (ok) {
      driverDownloaded++;
      console.log(" OK");
      await sleep(200);
      continue;
    }
  }

  driverFailed++;
  console.log(" MISS");
  await sleep(200);
}

console.log(`\nDrivers: ${driverDownloaded} downloaded, ${driverFailed} not found`);

// ─── Summary ───

const finalDrivers = (await readdir(DRIVERS_DIR)).filter(f => /\.(webp|png)$/.test(f));
const finalLogos = (await readdir(LOGOS_DIR)).filter(f => /\.(webp|png|svg)$/.test(f));

console.log(`\n=== FINAL TOTALS ===`);
console.log(`Driver images: ${finalDrivers.length}`);
console.log(`Team logos: ${finalLogos.length}`);
