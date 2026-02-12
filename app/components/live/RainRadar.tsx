"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { CIRCUIT_COORDS } from "@/app/data/circuit-coordinates";
import {
  fetchRainViewerData,
  buildRadarTileUrl,
  getRadarFrames,
} from "@/app/lib/rainviewer";
import type { RainViewerFrame } from "@/app/types/rainviewer";

interface RainRadarProps {
  circuitShortName: string;
}

const RADAR_REFRESH_MS = 10 * 60 * 1000; // 10 minutes

function formatRelativeTime(time: number, nowSec: number): string {
  const diff = Math.round((time - nowSec) / 60);
  if (diff < 0) return `${Math.abs(diff)} min ago`;
  if (diff === 0) return "Now";
  return `Nowcast +${diff} min`;
}

export default function RainRadar({ circuitShortName }: RainRadarProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timestampRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const frameCountRef = useRef(0);

  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);

  const coords = CIRCUIT_COORDS[circuitShortName];

  useEffect(() => {
    if (!coords || !mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          carto: {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
            attribution: "&copy; CartoDB &copy; OpenStreetMap",
          },
        },
        layers: [{ id: "carto-layer", type: "raster", source: "carto" }],
      },
      center: [coords.lng, coords.lat],
      zoom: coords.zoom,
      attributionControl: false,
    });

    mapRef.current = map;

    new maplibregl.Marker({ color: "#ef4444" })
      .setLngLat([coords.lng, coords.lat])
      .addTo(map);

    let cancelled = false;
    const abortController = new AbortController();

    // Load radar frames onto the map and start animation
    async function loadRadarFrames(isRefresh: boolean) {
      try {
        const data = await fetchRainViewerData(
          isRefresh ? undefined : abortController.signal,
        );
        if (cancelled) return;

        const { frames, host } = getRadarFrames(data);
        if (frames.length === 0) return;

        // On refresh: remove old radar layers/sources before adding new ones
        if (isRefresh) {
          if (animationRef.current) clearInterval(animationRef.current);
          for (let i = 0; i < frameCountRef.current; i++) {
            if (map.getLayer(`radar-layer-${i}`)) map.removeLayer(`radar-layer-${i}`);
            if (map.getSource(`radar-${i}`)) map.removeSource(`radar-${i}`);
          }
        }

        frameCountRef.current = frames.length;

        frames.forEach((frame: RainViewerFrame, i: number) => {
          map.addSource(`radar-${i}`, {
            type: "raster",
            tiles: [buildRadarTileUrl(host, frame)],
            tileSize: 256,
          });
          map.addLayer({
            id: `radar-layer-${i}`,
            type: "raster",
            source: `radar-${i}`,
            paint: { "raster-opacity": 0 },
          });
        });

        // Animate — update DOM directly via refs, no React re-renders
        let idx = 0;
        const nowSec = Math.floor(Date.now() / 1000);

        function showFrame() {
          if (cancelled) return;
          const prevIdx = idx === 0 ? frames.length - 1 : idx - 1;
          if (map.getLayer(`radar-layer-${prevIdx}`)) {
            map.setPaintProperty(`radar-layer-${prevIdx}`, "raster-opacity", 0);
          }
          if (map.getLayer(`radar-layer-${idx}`)) {
            map.setPaintProperty(`radar-layer-${idx}`, "raster-opacity", 0.6);
          }

          // Direct DOM updates — no setState
          if (timestampRef.current) {
            timestampRef.current.textContent = formatRelativeTime(
              frames[idx].time,
              nowSec,
            );
          }
          if (progressRef.current) {
            progressRef.current.style.width = `${((idx + 1) / frames.length) * 100}%`;
          }

          idx = (idx + 1) % frames.length;
        }

        showFrame();
        animationRef.current = setInterval(showFrame, 500);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    map.on("load", () => {
      loadRadarFrames(false);

      // Refresh radar data every 10 minutes to stay current
      refreshRef.current = setInterval(
        () => loadRadarFrames(true),
        RADAR_REFRESH_MS,
      );
    });

    return () => {
      cancelled = true;
      abortController.abort();
      if (animationRef.current) clearInterval(animationRef.current);
      if (refreshRef.current) clearInterval(refreshRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, [coords]);

  if (!coords) return null;

  if (error) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-white/30">Rain radar unavailable</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
          Rain Radar
        </h3>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="cursor-pointer text-xs text-white/40 transition-colors hover:text-white/70"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>
      <div
        className={`relative transition-[max-height] duration-300 overflow-hidden ${
          expanded ? "max-h-[450px]" : "max-h-[200px]"
        }`}
      >
        <div ref={mapContainer} className="h-[450px] w-full" />

        {/* Timestamp label — updated via ref, not state */}
        <div
          ref={timestampRef}
          className="absolute bottom-6 left-2 rounded bg-black/70 px-2 py-1 text-[10px] text-white/70"
        />

        {/* Progress bar — width updated via ref, not state */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div
            ref={progressRef}
            className="h-full bg-blue-500/60 transition-[width] duration-300"
            style={{ width: "0%" }}
          />
        </div>
      </div>
    </div>
  );
}
