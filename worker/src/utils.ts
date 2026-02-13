// ---------------------------------------------------------------------------
// Deep merge for SignalR delta accumulation
// ---------------------------------------------------------------------------

export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>,
): T {
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = (target as Record<string, unknown>)[key];

    if (
      srcVal !== null &&
      typeof srcVal === "object" &&
      !Array.isArray(srcVal) &&
      tgtVal !== null &&
      typeof tgtVal === "object" &&
      !Array.isArray(tgtVal)
    ) {
      (target as Record<string, unknown>)[key] = deepMerge(
        tgtVal as Record<string, unknown>,
        srcVal as Record<string, unknown>,
      );
    } else {
      (target as Record<string, unknown>)[key] = srcVal;
    }
  }
  return target;
}

// ---------------------------------------------------------------------------
// Lap time parsing: "1:22.167" → 82.167 seconds
// ---------------------------------------------------------------------------

export function parseLapTimeToSeconds(value: string | undefined): number | null {
  if (!value) return null;

  // Handle "M:SS.mmm" format
  const colonMatch = value.match(/^(\d+):(\d+\.\d+)$/);
  if (colonMatch) {
    return parseInt(colonMatch[1], 10) * 60 + parseFloat(colonMatch[2]);
  }

  // Handle "SS.mmm" format (sector times)
  const secMatch = value.match(/^(\d+\.\d+)$/);
  if (secMatch) {
    return parseFloat(secMatch[1]);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Gap value parsing: "+12.345" → 12.345, "LAP" → null, "1 LAP" → null
// ---------------------------------------------------------------------------

export function parseGapValue(value: string | undefined): number | null {
  if (!value) return null;
  if (value.includes("LAP")) return null;

  const cleaned = value.replace(/[^0-9.\-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// ---------------------------------------------------------------------------
// Sleep utility
// ---------------------------------------------------------------------------

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Logging with timestamps
// ---------------------------------------------------------------------------

export function log(message: string, ...args: unknown[]): void {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[${ts}] ${message}`, ...args);
}

export function logError(message: string, ...args: unknown[]): void {
  const ts = new Date().toISOString().slice(11, 23);
  console.error(`[${ts}] ERROR: ${message}`, ...args);
}
