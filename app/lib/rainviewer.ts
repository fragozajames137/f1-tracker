import type { RainViewerMapData, RainViewerFrame } from "@/app/types/rainviewer";

const RAINVIEWER_API = "https://api.rainviewer.com/public/weather-maps.json";

export async function fetchRainViewerData(
  signal?: AbortSignal,
): Promise<RainViewerMapData> {
  const res = await fetch(RAINVIEWER_API, { signal });
  if (!res.ok) throw new Error(`RainViewer API error: ${res.status}`);
  return res.json();
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
