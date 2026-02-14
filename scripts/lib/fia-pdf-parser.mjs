import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

/**
 * Parse an FIA stewards decision PDF and extract structured penalty data.
 * @param {Buffer} buffer - Raw PDF file buffer
 * @returns {object} Parsed decision fields
 */
export async function parseFiaDecisionPdf(buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  await parser.load();
  const result = await parser.getText();
  const text = typeof result === "string" ? result : result.text;
  await parser.destroy();
  return parseFiaDecisionText(text);
}

/**
 * Parse the raw text from an FIA stewards decision PDF.
 */
export function parseFiaDecisionText(text) {
  // Normalize whitespace but preserve newlines for field separation
  const normalized = text.replace(/\r\n/g, "\n").replace(/\t/g, " ");

  const result = {
    documentNumber: extractDocNumber(normalized),
    carNumber: extractCarNumber(normalized),
    driverName: extractDriver(normalized),
    competitor: extractField(normalized, /Competitor\s*[:.]?\s*(.+?)(?=\n|Time|Date|Session)/is),
    session: extractSessionField(normalized),
    fact: extractField(normalized, /Fact\s*[:.]?\s*(.+?)(?=(?:Offence|Infringement)\b)/is),
    offence: extractField(normalized, /(?:Offence|Infringement)\s*[:.]?\s*(.+?)(?=Decision\b)/is),
    decisionText: extractField(normalized, /Decision\s*[:.]?\s*(.+?)(?=Reason\b)/is),
    reason: extractField(normalized, /Reason\s*[:.]?\s*(.+?)(?=Competitors?\s*are|Stewards|The Stewards|$)/is),
  };

  result.penalties = extractPenalties(result.decisionText);
  result.noFurtherAction =
    /no\s*further\s*action/i.test(result.decisionText || "") ||
    /no\s*further\s*action/i.test(result.reason || "");

  return result;
}

function extractDocNumber(text) {
  const m = text.match(/Document\s*(\d+)/i);
  return m ? parseInt(m[1]) : null;
}

function extractCarNumber(text) {
  // "No / Driver" section often has "Car XX" or just the number
  const m =
    text.match(/Car\s*(\d+)/i) ||
    text.match(/No\s*[\/.]?\s*Driver\s*[:.]?\s*(\d+)/i);
  return m ? parseInt(m[1]) : null;
}

function extractDriver(text) {
  // Pattern: "No / Driver" followed by optional car number then driver name
  const m = text.match(
    /No\s*[\/.]?\s*Driver\s*[:.]?\s*(?:\d+\s*[\/.]?\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/,
  );
  if (m) return m[1].trim();

  // Fallback: look for name after car number
  const m2 = text.match(/Car\s*\d+\s*[\/\-.]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
  return m2 ? m2[1].trim() : null;
}

function extractSessionField(text) {
  const m = text.match(/Session\s*[:.]?\s*(Race|FP[123]|Sprint|Qualifying|Sprint Qualifying|Practice\s*\d|Pre-Race)/i);
  if (!m) return null;
  const s = m[1].trim();
  if (/practice\s*1/i.test(s)) return "FP1";
  if (/practice\s*2/i.test(s)) return "FP2";
  if (/practice\s*3/i.test(s)) return "FP3";
  return s;
}

function extractField(text, regex, group = 1) {
  const m = text.match(regex);
  if (!m) return null;
  return m[group].replace(/\s+/g, " ").trim();
}

/**
 * Extract penalty details from the "Decision" section text.
 */
export function extractPenalties(decisionText) {
  if (!decisionText) return defaultPenalties();
  const t = decisionText;

  return {
    timePenalty: matchNumber(t, /(\d+)\s*second(?:s)?\s*time\s*penalty/i) ??
      matchNumber(t, /time\s*penalty\s*of\s*(\d+)\s*second/i),
    gridPenalty: matchNumber(t, /(\d+)[\s-]*(?:grid\s*)?place(?:s)?\s*(?:grid\s*)?penalty/i) ??
      matchNumber(t, /grid\s*(?:place\s*)?penalty\s*of\s*(\d+)/i),
    penaltyPoints: matchNumber(t, /(\d+)\s*penalty\s*point/i) ?? 0,
    driveThrough: /drive[\s-]*through\s*penalty/i.test(t),
    reprimand: /reprimand/i.test(t),
    disqualified: /disqualif/i.test(t),
    fine: matchFine(t),
    other: null,
  };
}

function matchNumber(text, regex) {
  const m = text.match(regex);
  return m ? parseInt(m[1]) : null;
}

function matchFine(text) {
  const m = text.match(/fine\s*of\s*((?:EUR?|USD?|\€|\$)\s*[\d,]+(?:\.\d{2})?)/i);
  return m ? m[1].trim() : null;
}

function defaultPenalties() {
  return {
    timePenalty: null,
    gridPenalty: null,
    penaltyPoints: 0,
    driveThrough: false,
    reprimand: false,
    disqualified: false,
    fine: null,
    other: null,
  };
}
