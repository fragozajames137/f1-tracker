import type { RainViewerMapData, RainViewerFrame } from "@/app/types/rainviewer";

const RAINVIEWER_API = "https://api.rainviewer.com/public/weather-maps.json";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes — RainViewer updates every 10 min

let cachedData: RainViewerMapData | null = null;
let cachedAt = 0;

export async function fetchRainViewerData(
  signal?: AbortSignal,
): Promise<RainViewerMapData> {
  if (cachedData && Date.now() - cachedAt < CACHE_TTL) return cachedData;
  const res = await fetch(RAINVIEWER_API, { signal });
  if (!res.ok) throw new Error(`RainViewer API error: ${res.status}`);
  cachedData = await res.json();
  cachedAt = Date.now();
  return cachedData!;
}

export function buildRadarTileUrl(
  host: string,
  frame: RainViewerFrame,
): string {
  return `${host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;
}

export function getRadarFrames(data: RainViewerMapData): {
  frames: RainViewerFrame[];
  host: string;
} {
  return {
    frames: [...data.radar.past, ...data.radar.nowcast],
    host: data.host,
  };
}
