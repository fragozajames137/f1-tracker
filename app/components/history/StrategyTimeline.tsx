"use client";

import { useState, useEffect } from "react";
import { COMPOUNDS } from "@/app/lib/format";

interface DriverInfo {
  driverNumber: number;
  abbreviation: string;
  teamName: string;
  teamColor: string;
  finalPosition: number | null;
}

interface Stint {
  driverNumber: number;
  stintNumber: number;
  compound: string | null;
  startLap: number | null;
  endLap: number | null;
  totalLaps: number | null;
}

interface StrategyData {
  drivers: DriverInfo[];
  stints: Stint[];
  pitStops: unknown[];
}

interface StrategyTimelineProps {
  sessionKey: number;
}

export default function StrategyTimeline({ sessionKey }: StrategyTimelineProps) {
  const [data, setData] = useState<StrategyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/sessions/${sessionKey}/strategy`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch(() => setError("Failed to load strategy data"))
      .finally(() => setLoading(false));
  }, [sessionKey]);

  if (loading) {
    return <p className="py-8 text-center text-sm text-white/40">Loading strategy...</p>;
  }

  if (error || !data) {
    return <p className="py-8 text-center text-sm text-red-400">{error ?? "No data"}</p>;
  }

  if (data.stints.length === 0) {
    return <p className="py-8 text-center text-sm text-white/30">No stint data available</p>;
  }

  const maxLap = Math.max(
    ...data.stints
      .map((s) => s.endLap ?? 0)
      .filter((l) => l > 0),
    1,
  );

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        Tire Strategy
      </h3>
      <div className="space-y-1">
        {data.drivers.map((driver) => {
          const driverStints = data.stints
            .filter((s) => s.driverNumber === driver.driverNumber)
            .sort((a, b) => a.stintNumber - b.stintNumber);

          if (driverStints.length === 0) return null;

          return (
            <div key={driver.driverNumber} className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-right text-[10px] font-semibold text-white/70 sm:w-10 sm:text-xs">
                {driver.abbreviation}
              </span>
              <div className="flex flex-1 gap-px">
                {driverStints.map((stint) => {
                  const start = stint.startLap ?? 1;
                  const end = stint.endLap ?? start;
                  const stintLaps = end - start + 1;
                  const width = (stintLaps / maxLap) * 100;
                  const compound = (stint.compound ?? "UNKNOWN").toUpperCase();
                  const color = COMPOUNDS[compound]?.hex ?? COMPOUNDS.UNKNOWN.hex;

                  return (
                    <div
                      key={stint.stintNumber}
                      className="relative h-5 rounded-sm sm:h-6"
                      style={{
                        width: `${width}%`,
                        background: `linear-gradient(to right, ${color}, ${color}dd, ${color}99)`,
                        opacity: 0.8,
                      }}
                      title={`${stint.compound ?? "Unknown"} | Laps ${start}–${end} (${stintLaps} laps)`}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-black/60 sm:text-[9px]">
                        {(stint.compound ?? "?").charAt(0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {/* Compound legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/50">
        {Object.entries(COMPOUNDS)
          .filter(([key]) => key !== "UNKNOWN")
          .map(([compound, { hex }]) => (
            <span key={compound} className="flex items-center gap-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: hex }}
              />
              {compound.charAt(0) + compound.slice(1).toLowerCase()}
            </span>
          ))}
      </div>
    </div>
  );
}
