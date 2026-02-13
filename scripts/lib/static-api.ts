import type { RawSeasonIndex } from "../../app/types/f1-static";

const BASE_URL = "https://livetiming.formula1.com/static";
const MIRROR_URL = "https://livetiming-mirror.fastf1.dev/static";
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;
const DELAY_BETWEEN_REQUESTS_MS = 200;

let lastRequestTime = 0;

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < DELAY_BETWEEN_REQUESTS_MS) {
    await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

async function fetchOnce(url: string): Promise<Response | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await throttle();
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "f1-tracker/1.0" },
      });
      if (res.status === 404) return null;
      if (res.ok) return res;
      // 403 = access denied, don't retry (fall through to mirror)
      if (res.status === 403) return null;
      // Retry on 5xx or 429
      if (res.status >= 500 || res.status === 429) {
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_BASE_MS * Math.pow(2, attempt);
          console.warn(
            `  Retry ${attempt + 1}/${MAX_RETRIES} for ${url} (status ${res.status}), waiting ${delay}ms`,
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }
      console.error(`  Failed to fetch ${url}: ${res.status} ${res.statusText}`);
      return null;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt);
        console.warn(
          `  Retry ${attempt + 1}/${MAX_RETRIES} for ${url} (${(err as Error).message}), waiting ${delay}ms`,
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      console.error(`  Failed to fetch ${url}:`, (err as Error).message);
      return null;
    }
  }
  return null;
}

/**
 * Fetch with automatic fallback to FastF1 mirror for seasons where F1's
 * official API returns 403 (e.g. 2022).
 */
async function fetchWithRetry(url: string): Promise<Response | null> {
  const res = await fetchOnce(url);
  if (res) return res;

  // Try mirror as fallback
  if (url.startsWith(BASE_URL)) {
    const mirrorUrl = MIRROR_URL + url.slice(BASE_URL.length);
    const mirrorRes = await fetchOnce(mirrorUrl);
    if (mirrorRes) {
      console.log(`  (fetched from mirror: ${mirrorUrl})`);
      return mirrorRes;
    }
  }

  return null;
}

/**
 * Fetch the season index for a given year.
 */
export async function fetchSeasonIndex(
  year: number,
): Promise<RawSeasonIndex | null> {
  const url = `${BASE_URL}/${year}/Index.json`;
  const res = await fetchWithRetry(url);
  if (!res) return null;
  const text = await res.text();
  // F1 API sometimes prepends BOM
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

/**
 * Fetch a specific JSON file for a session.
 * Returns null on 404 (file doesn't exist for this session type).
 */
export async function fetchSessionFile<T>(
  path: string,
  filename: string,
): Promise<T | null> {
  // path may or may not have trailing slash
  const normalizedPath = path.endsWith("/") ? path : `${path}/`;
  const url = `${BASE_URL}/${normalizedPath}${filename}`;
  const res = await fetchWithRetry(url);
  if (!res) return null;
  const text = await res.text();
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}
