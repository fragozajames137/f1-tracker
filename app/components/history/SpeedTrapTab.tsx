"use client";

import { useState, useEffect, useMemo } from "react";

interface SpeedTrapDriver {
  driverNumber: number;
  abbreviation: string;
  teamColor: string | null;
  speedTrapBest: number | null;
  sector1SpeedBest: number | null;
  sector2SpeedBest: number | null;
  finishLineSpeedBest: number | null;
  finalPosition: number | null;
}

type SpeedCategory = "speedTrap" | "sector1" | "sector2" | "finishLine";

const CATEGORIES: { key: SpeedCategory; label: string; field: keyof SpeedTrapDriver }[] = [
  { key: "speedTrap", label: "Speed Trap", field: "speedTrapBest" },
  { key: "sector1", label: "Sector 1", field: "sector1SpeedBest" },
  { key: "sector2", label: "Sector 2", field: "sector2SpeedBest" },
  { key: "finishLine", label: "Finish Line", field: "finishLineSpeedBest" },
];

function getSpeedColor(speed: number): string {
  if (speed >= 320) return "#ef4444";
  if (speed >= 300) return "#f97316";
  if (speed >= 280) return "#eab308";
  return "#22c55e";
}

interface SpeedTrapTabProps {
  sessionKey: number;
}

export default function SpeedTrapTab({ sessionKey }: SpeedTrapTabProps) {
  const [data, setData] = useState<SpeedTrapDriver[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<SpeedCategory>("speedTrap");

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/sessions/${sessionKey}/speed-traps`, { signal: ac.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((e) => { if (!ac.signal.aborted) setError("Failed to load speed trap data"); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [sessionKey]);

  const activeCategory = CATEGORIES.find((c) => c.key === category)!;

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data]
      .filter((d) => (d[activeCategory.field] as number | null) !== null)
      .sort((a, b) =>
        ((b[activeCategory.field] as number) ?? 0) -
        ((a[activeCategory.field] as number) ?? 0)
      );
  }, [data, activeCategory]);

  if (loading) {
    return <p className="py-8 text-center text-sm text-white/40">Loading speed data...</p>;
  }

  if (error || !data) {
    return <p className="py-8 text-center text-sm text-red-400">{error ?? "No data"}</p>;
  }

  if (sorted.length === 0) {
    return <p className="py-8 text-center text-sm text-white/30">No speed data for this session</p>;
  }

  const maxSpeed = (sorted[0][activeCategory.field] as number) ?? 0;
  const minSpeed = (sorted[sorted.length - 1][activeCategory.field] as number) ?? 0;
  const range = maxSpeed - minSpeed || 1;

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
        Speed Traps
      </h3>

      {/* Category selector */}
      <div className="mb-4 flex overflow-hidden rounded-lg border border-white/10">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors ${
              category === cat.key
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Speed bars */}
      <div className="space-y-1.5">
        {sorted.map((entry, i) => {
          const speed = (entry[activeCategory.field] as number) ?? 0;
          const pct = range > 0
            ? 30 + ((speed - minSpeed) / range) * 70
            : 100;

          return (
            <div key={entry.driverNumber} className="flex items-center gap-2">
              <span
                className="w-8 shrink-0 text-right text-[10px] font-semibold"
                style={{ color: entry.teamColor ? `#${entry.teamColor}` : "#666" }}
              >
                {entry.abbreviation}
              </span>
              <div className="relative h-5 flex-1 overflow-hidden rounded-sm bg-white/5">
                <div
                  className="absolute inset-y-0 left-0 rounded-sm transition-[width] duration-300"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: getSpeedColor(speed),
                    opacity: i === 0 ? 0.9 : 0.6,
                  }}
                />
                <span
                  className="absolute inset-y-0 right-1.5 flex items-center text-[10px] font-bold tabular-nums"
                  style={{
                    color: i === 0 ? "#fff" : "rgba(255,255,255,0.7)",
                    fontFamily: "'Space Mono', ui-monospace, monospace",
                  }}
                >
                  {speed}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-right text-[10px] text-white/20">km/h</div>
    </div>
  );
}
