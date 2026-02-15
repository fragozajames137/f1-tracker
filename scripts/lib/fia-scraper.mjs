import { load } from "cheerio";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, "..", "cache");
const PDF_CACHE_DIR = join(CACHE_DIR, "fia-pdfs");

const FIA_BASE = "https://www.fia.com";
const DELAY_MS = 1500; // rate limit between FIA requests

// FIA Drupal season IDs — not derivable from year, discovered from the site
const SEASON_IDS = {
  2025: 2071,
  2024: 2043,
  2023: 2042,
  2022: 2005,
  2021: 1108,
  2020: 1059,
  2019: 971,
};

const CHAMPIONSHIP_PATH =
  "/documents/championships/fia-formula-one-world-championship-14/season";

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

function getSeasonUrl(season) {
  const id = SEASON_IDS[season];
  if (!id) throw new Error(`No FIA season ID for ${season}`);
  return `${CHAMPIONSHIP_PATH}/season-${season}-${id}`;
}

async function fetchWithRetry(url, options = {}, retries = 3) {
  const headers = { "User-Agent": "f1-tracker-sync/1.0", ...options.headers };
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url, { ...options, headers });
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) {
      const delay = [5000, 15000, 45000][attempt - 1] || 45000;
      console.error(`  ⚠ ${res.status} on attempt ${attempt}, retrying in ${delay / 1000}s...`);
      await sleep(delay);
      continue;
    }
    throw new Error(`HTTP ${res.status}: ${url}`);
  }
  throw new Error(`Failed after ${retries} retries: ${url}`);
}

// ── Public API ──────────────────────────────────────────────────────────────

export function getAllSeasons() {
  return Object.keys(SEASON_IDS).map(Number).sort();
}

/**
 * Fetch event name → event ID mapping for a season from the FIA season page.
 */
export async function fetchEventIds(season) {
  ensureCacheDirs();
  const cachePath = join(CACHE_DIR, `fia-event-ids-${season}.json`);
  const currentYear = new Date().getFullYear();

  // Cache TTL: 30 days for historical seasons, 7 days for current
  const ttl = season < currentYear ? 30 * 86400000 : 7 * 86400000;

  if (existsSync(cachePath)) {
    const cached = JSON.parse(readFileSync(cachePath, "utf-8"));
    if (Date.now() - cached._cachedAt < ttl) return cached.events;
  }

  const seasonPath = getSeasonUrl(season);
  const res = await fetchWithRetry(`${FIA_BASE}${seasonPath}`);
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

  writeFileSync(
    cachePath,
    JSON.stringify({ _cachedAt: Date.now(), events }, null, 2),
  );
  return events;
}

/**
 * Fetch documents for a specific event by name.
 */
export async function fetchEventDocuments(raceName, season = 2025) {
  const eventIds = await fetchEventIds(season);

  // Find matching event by partial name match
  const raceBase = raceName.toLowerCase().replace(/ grand prix$/i, "");
  const matchKey = Object.keys(eventIds).find((k) =>
    k.toLowerCase().includes(raceBase),
  );

  if (!matchKey) {
    console.error(`  ⚠ No FIA event found for "${raceName}" in ${season}`);
    return [];
  }

  return fetchEventDocumentsByEventId(eventIds[matchKey], matchKey);
}

/**
 * Fetch documents for a specific event by FIA event ID.
 * Uses the AJAX endpoint which returns all documents reliably.
 */
export async function fetchEventDocumentsByEventId(eventId, eventName = "") {
  ensureCacheDirs();
  const cachePath = join(CACHE_DIR, `fia-docs-event-${eventId}.json`);
  const currentYear = new Date().getFullYear();

  // Cache TTL: 4 hours for recent events (docs may still be added during a weekend)
  if (existsSync(cachePath)) {
    const cached = JSON.parse(readFileSync(cachePath, "utf-8"));
    if (Date.now() - cached._cachedAt < 4 * 3600000) {
      return cached.documents;
    }
  }

  await sleep(DELAY_MS);

  // Use the AJAX endpoint — returns clean JSON with document HTML
  const ajaxUrl = `${FIA_BASE}/decision-document-list/ajax/${eventId}`;
  const res = await fetchWithRetry(ajaxUrl, {
    headers: { Accept: "application/json" },
  });

  let documents = [];
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("json")) {
    const json = await res.json();
    documents = parseAjaxResponse(json);
  } else {
    // Fallback: treat as HTML (nojs response)
    const html = await res.text();
    documents = parseDocumentLinksFromHtml(html);
  }

  writeFileSync(
    cachePath,
    JSON.stringify({ _cachedAt: Date.now(), eventId, eventName, documents }, null, 2),
  );
  return documents;
}

/**
 * Parse the Drupal AJAX JSON response to extract document links.
 * The response is an array of commands; the one with document HTML
 * has a `data` field containing the full document list markup.
 */
function parseAjaxResponse(json) {
  if (!Array.isArray(json)) return [];

  // Find the command that contains document HTML
  let html = "";
  for (const cmd of json) {
    if (cmd.data && typeof cmd.data === "string" && cmd.data.includes(".pdf")) {
      html = cmd.data;
      break;
    }
  }

  if (!html) return [];
  return parseDocumentLinksFromHtml(html);
}

/**
 * Parse document links from HTML (works for both AJAX fragments and full pages).
 * Extracts car-specific decision/infringement documents.
 */
function parseDocumentLinksFromHtml(html) {
  const $ = load(html);
  const documents = [];

  // Try structured li.document-row first (AJAX response)
  const rows = $("li.document-row, li[class*='document-row']");

  if (rows.length > 0) {
    rows.each((_, row) => {
      const $row = $(row);
      const $link = $row.find("a[href$='.pdf']").first();
      if (!$link.length) return;

      const href = $link.attr("href") || "";
      const title =
        $row.find(".title .field-item").first().text().trim() ||
        $link.text().trim();
      const dateText = $row.find(".published .date-display-single, .date-display-single").first().text().trim();

      if (!isCarDecisionDocument(title, href)) return;

      documents.push(buildDocumentEntry(title, href, dateText));
    });
  } else {
    // Fallback: flat scan for PDF links
    $("a[href$='.pdf']").each((_, el) => {
      const href = $(el).attr("href") || "";
      const title = $(el).text().trim();

      if (!href.includes("/decision-document/")) return;
      if (!isCarDecisionDocument(title, href)) return;

      documents.push(buildDocumentEntry(title, href, ""));
    });
  }

  return documents;
}

/**
 * Check if a document is a car-specific decision/infringement.
 */
function isCarDecisionDocument(title, href) {
  const combined = `${title} ${href}`;
  if (!/decision|infringement/i.test(combined)) return false;
  if (!/car[\s_]+\d+/i.test(combined)) return false;
  return true;
}

/**
 * Build a standardized document entry from title, href, and date text.
 */
function buildDocumentEntry(title, href, dateText) {
  const docMatch = title.match(/Doc\s*(\d+)/i);
  const carMatch = title.match(/Car\s*(\d+)/i) || href.match(/car[_\s]+(\d+)/i);

  // Parse published date (format: "DD.MM.YY HH:MM" or "Published on DD.MM.YY HH:MM CET")
  let publishedDate = null;
  const dateMatch = dateText.match(/(\d{2})\.(\d{2})\.(\d{2,4})/);
  if (dateMatch) {
    let year = parseInt(dateMatch[3]);
    if (year < 100) year += 2000;
    publishedDate = `${year}-${dateMatch[2]}-${dateMatch[1]}`;
  }

  return {
    title,
    docNumber: docMatch ? parseInt(docMatch[1]) : null,
    carNumber: carMatch ? parseInt(carMatch[1]) : null,
    pdfUrl: href.startsWith("http") ? href : `${FIA_BASE}${href}`,
    allegation: title.replace(/^Doc\s*\d+\s*-?\s*/i, "").trim(),
    publishedDate,
  };
}

// ── Download a PDF with caching ─────────────────────────────────────────────
export async function downloadPdf(pdfUrl) {
  ensureCacheDirs();

  // Cache filename — prefix with a hash of the directory path for uniqueness
  const urlParts = pdfUrl.split("/");
  const filename = urlParts.pop().replace(/\.pdf$/i, "");
  const cachePath = join(PDF_CACHE_DIR, `${filename}.pdf`);

  if (existsSync(cachePath)) {
    return readFileSync(cachePath);
  }

  await sleep(DELAY_MS);
  const res = await fetchWithRetry(pdfUrl);

  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(cachePath, buffer);
  return buffer;
}
