import { load } from "cheerio";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, "..", "cache");
const PDF_CACHE_DIR = join(CACHE_DIR, "fia-pdfs");

const FIA_BASE = "https://www.fia.com";
const DELAY_MS = 1500; // rate limit between FIA requests

const SEASON_URLS = {
  2025: "/documents/championships/fia-formula-one-world-championship-14/season/season-2025-2071",
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function ensureCacheDirs() {
  if (!existsSync(PDF_CACHE_DIR)) mkdirSync(PDF_CACHE_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function slugifyEvent(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

// ── Fetch event IDs from FIA season page ────────────────────────────────────
export async function fetchEventIds(season = 2025) {
  ensureCacheDirs();
  const cachePath = join(CACHE_DIR, `fia-event-ids-${season}.json`);

  // Check cache (7-day TTL)
  if (existsSync(cachePath)) {
    const cached = JSON.parse(readFileSync(cachePath, "utf-8"));
    if (Date.now() - cached._cachedAt < 7 * 86400000) return cached.events;
  }

  const seasonPath = SEASON_URLS[season];
  if (!seasonPath) throw new Error(`No FIA season URL configured for ${season}`);

  const res = await fetch(`${FIA_BASE}${seasonPath}`, {
    headers: { "User-Agent": "f1-tracker-sync/1.0" },
  });
  if (!res.ok) throw new Error(`FIA season page: ${res.status}`);
  const html = await res.text();
  const $ = load(html);

  const events = {};
  $('a[href*="decision-document-list/nojs/"]').each((_, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().trim();
    const idMatch = href.match(/\/nojs\/(\d+)/);
    if (idMatch && text) {
      events[text] = parseInt(idMatch[1]);
    }
  });

  // Also capture the currently displayed event's documents
  // (the FIA page shows one event expanded by default)

  writeFileSync(
    cachePath,
    JSON.stringify({ _cachedAt: Date.now(), events }, null, 2),
  );
  return events;
}

// ── Fetch decision PDF URLs for a specific event ────────────────────────────
export async function fetchEventDocuments(raceName, season = 2025) {
  ensureCacheDirs();
  const cacheKey = slugifyEvent(`${season}_${raceName}`);
  const cachePath = join(CACHE_DIR, `fia-docs-${cacheKey}.json`);

  // Check cache (4-hour TTL during race weekends)
  if (existsSync(cachePath)) {
    const cached = JSON.parse(readFileSync(cachePath, "utf-8"));
    if (Date.now() - cached._cachedAt < 4 * 3600000) return cached.documents;
  }

  // Strategy 1: Try to fetch the season page (it shows docs for the most recent event)
  // Strategy 2: Try the nojs event sub-page
  // Strategy 3: Construct URLs from naming convention

  let documents = [];

  // Try the season page first
  const seasonPath = SEASON_URLS[season];
  if (seasonPath) {
    try {
      const res = await fetch(`${FIA_BASE}${seasonPath}`, {
        headers: { "User-Agent": "f1-tracker-sync/1.0" },
      });
      if (res.ok) {
        const html = await res.text();
        documents = parseDocumentLinks(html, raceName);
      }
    } catch {
      // fall through to event sub-page
    }
  }

  // If no documents found, try the nojs event page
  if (documents.length === 0) {
    try {
      const eventIds = await fetchEventIds(season);
      // Find matching event by partial name match
      const matchKey = Object.keys(eventIds).find((k) =>
        k.toLowerCase().includes(raceName.toLowerCase().replace(/ grand prix$/i, "")),
      );
      if (matchKey) {
        await sleep(DELAY_MS);
        const eventUrl = `${FIA_BASE}/decision-document-list/nojs/${eventIds[matchKey]}`;
        const res = await fetch(eventUrl, {
          headers: { "User-Agent": "f1-tracker-sync/1.0" },
        });
        if (res.ok) {
          const html = await res.text();
          documents = parseDocumentLinks(html, raceName);
        }
      }
    } catch {
      // fall through
    }
  }

  writeFileSync(
    cachePath,
    JSON.stringify({ _cachedAt: Date.now(), documents }, null, 2),
  );
  return documents;
}

function parseDocumentLinks(html, raceName) {
  const $ = load(html);
  const documents = [];
  const raceSlug = raceName.toLowerCase().replace(/ /g, "");

  $("a[href$='.pdf']").each((_, el) => {
    const href = $(el).attr("href") || "";
    const title = $(el).text().trim();

    // Only interested in decision/infringement documents about specific cars
    if (!href.includes("/decision-document/")) return;
    if (!/decision|infringement/i.test(title) && !/decision|infringement/i.test(href)) return;
    if (!/car[\s_]+\d+/i.test(title) && !/car[\s_]+\d+/i.test(href)) return;

    // Extract metadata from title
    const docMatch = title.match(/Doc\s*(\d+)/i);
    const carMatch = title.match(/Car\s*(\d+)/i) || href.match(/car[_\s]+(\d+)/i);

    documents.push({
      title,
      docNumber: docMatch ? parseInt(docMatch[1]) : null,
      carNumber: carMatch ? parseInt(carMatch[1]) : null,
      pdfUrl: href.startsWith("http") ? href : `${FIA_BASE}${href}`,
      allegation: title.replace(/^Doc\s*\d+\s*-?\s*/i, "").trim(),
    });
  });

  return documents;
}

// ── Download a PDF with caching ─────────────────────────────────────────────
export async function downloadPdf(pdfUrl) {
  ensureCacheDirs();

  // Cache filename from URL slug
  const slug = pdfUrl.split("/").pop().replace(/\.pdf$/i, "");
  const cachePath = join(PDF_CACHE_DIR, `${slug}.pdf`);

  if (existsSync(cachePath)) {
    return readFileSync(cachePath);
  }

  await sleep(DELAY_MS);
  const res = await fetch(pdfUrl, {
    headers: { "User-Agent": "f1-tracker-sync/1.0" },
  });
  if (!res.ok) throw new Error(`PDF download failed (${res.status}): ${pdfUrl}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(cachePath, buffer);
  return buffer;
}
