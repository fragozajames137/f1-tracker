#!/usr/bin/env node

/**
 * Generates PWA icons as SVG files (no external deps needed).
 * Run: node scripts/generate-icons.mjs
 */

import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");

mkdirSync(outDir, { recursive: true });

function generateSvgIcon(size) {
  const fontSize = Math.round(size * 0.22);
  const subFontSize = Math.round(size * 0.07);
  const centerY = Math.round(size * 0.48);
  const subY = Math.round(size * 0.65);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0a0a0a"/>
  <rect x="${Math.round(size * 0.08)}" y="${Math.round(size * 0.08)}" width="${Math.round(size * 0.84)}" height="${Math.round(size * 0.84)}" rx="${Math.round(size * 0.12)}" fill="#111"/>
  <line x1="${Math.round(size * 0.15)}" y1="${Math.round(size * 0.82)}" x2="${Math.round(size * 0.85)}" y2="${Math.round(size * 0.82)}" stroke="#e53e3e" stroke-width="${Math.round(size * 0.02)}" stroke-linecap="round"/>
  <text x="50%" y="${centerY}" text-anchor="middle" dominant-baseline="central" fill="white" font-family="system-ui,-apple-system,sans-serif" font-weight="800" font-size="${fontSize}">P2P</text>
  <text x="50%" y="${subY}" text-anchor="middle" dominant-baseline="central" fill="rgba(255,255,255,0.4)" font-family="system-ui,-apple-system,sans-serif" font-weight="500" font-size="${subFontSize}">POLE TO PADDOCK</text>
</svg>`;
}

const sizes = [192, 512];

for (const size of sizes) {
  const svg = generateSvgIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  writeFileSync(join(outDir, filename), svg);
  console.log(`Created ${filename}`);
}

console.log("PWA icons generated successfully.");
