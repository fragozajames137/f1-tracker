"use client";

import { useState, useEffect, useMemo } from "react";
import type { TelemetrySession, TelemetrySpeedTrace, TelemetryDriver } from "@/app/types/telemetry";
import ShareCard from "../shared/ShareCard";

const PADDING = 20;
const VIEW_SIZE = 500;

interface TrackDominanceProps {
  year: number;
  round: number;
  raceName?: string;
}

function computeTransform(xs: number[], ys: number[]) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const x of xs) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  for (const y of ys) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = (VIEW_SIZE - PADDING * 2) / Math.max(rangeX, rangeY);
  const usable = VIEW_SIZE - PADDING * 2;
  const offsetX = PADDING + (usable - rangeX * scale) / 2;
  const offsetY = PADDING + (usable - rangeY * scale) / 2;

  return (x: number, y: number): [number, number] => [
    offsetX + (x - minX) * scale,
    offsetY + (maxY - y) * scale,
  ];
}

function deltaToColor(
  delta: number,
  colorA: string,
  colorB: string,
  maxDelta: number,
): string {
  if (maxDelta === 0) return "#666";
  const t = Math.min(Math.abs(delta) / maxDelta, 1);
  const intensity = Math.round(t * 255);

  if (delta < 0) {
    // Driver A faster
    return colorA + intensity.toString(16).padStart(2, "0").slice(0, 2);
  } else if (delta > 0) {
    // Driver B faster
    return colorB + intensity.toString(16).padStart(2, "0").slice(0, 2);
  }
  return "#666";
}

function raceNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function TrackDominance({ year, round, raceName }: TrackDominanceProps) {
  const [session, setSession] = useState<TelemetrySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);
  const [driverA, setDriverA] = useState<number | null>(null);
  const [driverB, setDriverB] = useState<number | null>(null);

  // Try to find telemetry file for this race
  useEffect(() => {
    setLoading(true);
    setNoData(false);

    const roundStr = String(round).padStart(2, "0");

    // Build candidate filenames from race name
    const candidates: string[] = [];
    if (raceName) {
      const slug = raceNameToSlug(raceName);
      candidates.push(`${year}-R${roundStr}-${slug}.json`);
    }
    // Fallback: try generic patterns
    candidates.push(`${year}-R${roundStr}-race.json`);

    const ac = new AbortController();
    async function tryFiles() {
      for (const filename of candidates) {
        if (ac.signal.aborted) return;
        try {
          const r = await fetch(`/api/telemetry?file=${filename}`, { signal: ac.signal });
          if (!r.ok) continue;
          const data: TelemetrySession = await r.json();
          setSession(data);
          if (data.drivers.length >= 2) {
            setDriverA(data.drivers[0].number);
            setDriverB(data.drivers[1].number);
          }
          return;
        } catch {
          continue;
        }
      }
      setNoData(true);
    }

    tryFiles().finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [year, round, raceName]);

  const traceA = useMemo(
    () =>
      session?.telemetryData.find(
        (t) => t.driverNumber === driverA && t.x && t.x.length > 1,
      ) ?? null,
    [session, driverA],
  );

  const traceB = useMemo(
    () =>
      session?.telemetryData.find(
        (t) => t.driverNumber === driverB && t.x && t.x.length > 1,
      ) ?? null,
    [session, driverB],
  );

  const driverInfoA = session?.drivers.find((d) => d.number === driverA);
  const driverInfoB = session?.drivers.find((d) => d.number === driverB);

  // Compute speed delta segments
  const segments = useMemo(() => {
    if (!traceA || !traceB || !traceA.x || !traceB.x) return null;

    const allX = [...traceA.x, ...traceB.x];
    const allY = [...traceA.y!, ...traceB.y!];
    const transform = computeTransform(allX, allY);

    // Interpolate traceB speeds onto traceA's distance points
    const segs: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      delta: number;
    }> = [];

    const len = Math.min(traceA.distance.length, traceA.speed.length);
    let maxDelta = 0;

    for (let i = 1; i < len; i++) {
      const dist = traceA.distance[i];
      // Find closest point in traceB by distance
      let closest = 0;
      let minDiff = Infinity;
      for (let j = 0; j < traceB.distance.length; j++) {
        const diff = Math.abs(traceB.distance[j] - dist);
        if (diff < minDiff) {
          minDiff = diff;
          closest = j;
        }
      }

      const speedA = traceA.speed[i];
      const speedB = traceB.speed[closest] ?? speedA;
      const delta = speedA - speedB; // positive = A faster

      const [x1, y1] = transform(traceA.x![i - 1], traceA.y![i - 1]);
      const [x2, y2] = transform(traceA.x![i], traceA.y![i]);

      if (Math.abs(delta) > maxDelta) maxDelta = Math.abs(delta);
      segs.push({ x1, y1, x2, y2, delta });
    }

    return { segments: segs, maxDelta };
  }, [traceA, traceB]);

  if (loading) {
    return <p className="py-8 text-center text-sm text-white/40">Loading track dominance...</p>;
  }

  if (noData || !session) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          Track Dominance
        </h3>
        <p className="text-sm text-white/30">
          Telemetry data not available for this session.
        </p>
        <p className="mt-1 text-xs text-white/20">
          Track dominance requires FastF1 telemetry data to be processed.
        </p>
      </div>
    );
  }

  const colorA = driverInfoA?.teamColor ?? "#3b82f6";
  const colorB = driverInfoB?.teamColor ?? "#ef4444";

  return (
    <ShareCard title="Track Dominance" subtitle={`${driverInfoA?.abbreviation ?? "?"} vs ${driverInfoB?.abbreviation ?? "?"}`}>
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
          Track Dominance
        </h3>

        {/* Driver selectors */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: colorA }}
            />
            <select
              value={driverA ?? ""}
              onChange={(e) => setDriverA(parseInt(e.target.value) || null)}
              className="cursor-pointer rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/30"
            >
              {session.drivers.map((d) => (
                <option key={d.number} value={d.number} className="bg-[#111]">
                  {d.abbreviation} — {d.teamName}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-white/30">vs</span>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: colorB }}
            />
            <select
              value={driverB ?? ""}
              onChange={(e) => setDriverB(parseInt(e.target.value) || null)}
              className="cursor-pointer rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-white/30"
            >
              {session.drivers.map((d) => (
                <option key={d.number} value={d.number} className="bg-[#111]">
                  {d.abbreviation} — {d.teamName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Track visualization */}
        {segments ? (
          <div className="flex justify-center">
            <svg
              viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
              className="h-auto w-full max-w-md"
              style={{ aspectRatio: "1" }}
            >
              {/* Track outline */}
              <path
                d={segments.segments
                  .map(
                    (s, i) =>
                      `${i === 0 ? "M" : "L"}${s.x1},${s.y1}`,
                  )
                  .join(" ")}
                fill="none"
                stroke="#333"
                strokeWidth={8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Speed-delta colored segments */}
              {segments.segments.map((seg, i) => {
                const color = deltaToColor(
                  seg.delta,
                  colorA,
                  colorB,
                  segments.maxDelta,
                );
                return (
                  <line
                    key={i}
                    x1={seg.x1}
                    y1={seg.y1}
                    x2={seg.x2}
                    y2={seg.y2}
                    stroke={color}
                    strokeWidth={4}
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-white/30">
            Select two different drivers with telemetry data
          </p>
        )}

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-6 rounded-sm"
              style={{ backgroundColor: colorA }}
            />
            {driverInfoA?.abbreviation ?? "Driver A"} faster
          </span>
          <span className="text-white/20">|</span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-6 rounded-sm"
              style={{ backgroundColor: colorB }}
            />
            {driverInfoB?.abbreviation ?? "Driver B"} faster
          </span>
        </div>

        {/* Speed trace comparison */}
        {traceA && traceB && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
              Speed Comparison
            </h4>
            <div className="h-32 w-full">
              <svg viewBox="0 0 800 120" className="h-full w-full">
                {[traceA, traceB].map((trace, idx) => {
                  const color = idx === 0 ? colorA : colorB;
                  const maxSpeed = Math.max(...trace.speed, 1);
                  const maxDist = trace.distance[trace.distance.length - 1] || 1;

                  const points = trace.distance
                    .map(
                      (d, i) =>
                        `${(d / maxDist) * 800},${120 - (trace.speed[i] / maxSpeed) * 110}`,
                    )
                    .join(" ");

                  return (
                    <polyline
                      key={idx}
                      points={points}
                      fill="none"
                      stroke={color}
                      strokeWidth={1.5}
                      opacity={0.8}
                    />
                  );
                })}
              </svg>
            </div>
          </div>
        )}
      </div>
    </ShareCard>
  );
}
