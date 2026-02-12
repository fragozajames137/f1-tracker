#!/usr/bin/env node

/**
 * Image optimization pipeline for F1 Tracker.
 *
 * Processes images in public/drivers/ and public/logos/:
 * - Resizes to standard widths (drivers: 48, 96, 192; logos: 24, 48)
 * - Outputs as WebP (quality 80)
 * - Generates 10px-wide blur placeholders as base64-encoded data URIs
 * - Writes blur manifest to public/blur-placeholders.json
 *
 * Usage: node scripts/optimize-images.mjs
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "public");

const DRIVER_SIZES = [48, 96, 192];
const LOGO_SIZES = [24, 48];
const WEBP_QUALITY = 80;
const BLUR_WIDTH = 10;

// Supported source extensions (order = priority for duplicate basenames)
const IMAGE_EXTS = [".webp", ".png", ".jpg", ".jpeg"];

function getImageFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE_EXTS.includes(path.extname(f).toLowerCase()));
}

// Deduplicate files with same basename (prefer webp > png > jpg)
function dedupeByBasename(files) {
  const seen = new Map();
  for (const file of files) {
    const base = path.parse(file).name;
    const ext = path.extname(file).toLowerCase();
    const priority = IMAGE_EXTS.indexOf(ext);
    if (!seen.has(base) || priority < seen.get(base).priority) {
      seen.set(base, { file, priority });
    }
  }
  return [...seen.entries()].map(([base, { file }]) => ({ base, file }));
}

async function processImage(srcDir, outDir, base, file, sizes) {
  const srcPath = path.join(srcDir, file);
  const input = sharp(srcPath);

  fs.mkdirSync(outDir, { recursive: true });

  for (const size of sizes) {
    const outPath = path.join(outDir, `${base}-${size}.webp`);
    await input
      .clone()
      .resize(size, size, { fit: "cover", position: "top" })
      .webp({ quality: WEBP_QUALITY })
      .toFile(outPath);
  }
}

async function generateBlurPlaceholder(srcDir, file) {
  const srcPath = path.join(srcDir, file);
  const blurBuffer = await sharp(srcPath)
    .resize(BLUR_WIDTH)
    .webp({ quality: 20 })
    .toBuffer();
  return `data:image/webp;base64,${blurBuffer.toString("base64")}`;
}

async function main() {
  const driversDir = path.join(PUBLIC, "drivers");
  const logosDir = path.join(PUBLIC, "logos");
  const driversOptDir = path.join(driversDir, "optimized");
  const logosOptDir = path.join(logosDir, "optimized");

  const blurPlaceholders = {};

  // Process drivers
  const driverFiles = dedupeByBasename(getImageFiles(driversDir));
  console.log(`Processing ${driverFiles.length} driver images...`);

  for (const { base, file } of driverFiles) {
    try {
      await processImage(driversDir, driversOptDir, base, file, DRIVER_SIZES);
      const blur = await generateBlurPlaceholder(driversDir, file);
      blurPlaceholders[`drivers/${base}`] = blur;
      process.stdout.write(".");
    } catch (err) {
      console.error(`\nFailed to process drivers/${file}: ${err.message}`);
    }
  }
  console.log(` Done (${driverFiles.length} drivers)`);

  // Process logos (skip SVGs — sharp can handle them but they may not resize well)
  const logoFiles = dedupeByBasename(
    getImageFiles(logosDir).filter(
      (f) => path.extname(f).toLowerCase() !== ".svg",
    ),
  );
  console.log(`Processing ${logoFiles.length} logo images...`);

  for (const { base, file } of logoFiles) {
    try {
      await processImage(logosDir, logosOptDir, base, file, LOGO_SIZES);
      const blur = await generateBlurPlaceholder(logosDir, file);
      blurPlaceholders[`logos/${base}`] = blur;
      process.stdout.write(".");
    } catch (err) {
      console.error(`\nFailed to process logos/${file}: ${err.message}`);
    }
  }
  console.log(` Done (${logoFiles.length} logos)`);

  // Write blur placeholders manifest
  const manifestPath = path.join(PUBLIC, "blur-placeholders.json");
  fs.writeFileSync(manifestPath, JSON.stringify(blurPlaceholders, null, 2));
  console.log(
    `\nWrote blur manifest: ${Object.keys(blurPlaceholders).length} entries → ${manifestPath}`,
  );

  // Summary
  const optDriverCount = fs.existsSync(driversOptDir)
    ? fs.readdirSync(driversOptDir).length
    : 0;
  const optLogoCount = fs.existsSync(logosOptDir)
    ? fs.readdirSync(logosOptDir).length
    : 0;
  console.log(
    `Optimized images: ${optDriverCount} driver + ${optLogoCount} logo files`,
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
