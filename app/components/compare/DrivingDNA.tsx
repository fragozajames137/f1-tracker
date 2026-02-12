"use client";

import type { DrivingDNABreakdown } from "@/app/lib/compare";

interface DrivingDNAProps {
  data: [DrivingDNABreakdown, DrivingDNABreakdown];
}

const MODES = [
  { key: "fullThrottle", label: "Full Throttle", color: "#22c55e" },
  { key: "partialThrottle", label: "Partial", color: "#eab308" },
  { key: "braking", label: "Braking", color: "#ef4444" },
  { key: "coasting", label: "Coasting", color: "#6b7280" },
] as const;

type ModeKey = (typeof MODES)[number]["key"];

export default function DrivingDNA({ data }: DrivingDNAProps) {
  const hasData = data.some(
    (d) => d.fullThrottle + d.partialThrottle + d.braking + d.coasting > 0,
  );

  if (!hasData) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          Driving DNA
        </h3>
        <p className="text-sm text-white/30">No telemetry data available</p>
      </div>
    );
  }

  const showDrs = data.some((d) => d.drsUsage !== null);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        Driving DNA
      </h3>
      <div className="space-y-2">
        {data.map((driver) => (
          <div key={driver.driverNumber} className="flex items-center gap-2">
            <span
              className="w-10 shrink-0 text-right text-xs font-semibold"
              style={{ color: driver.teamColor }}
            >
              {driver.abbreviation}
            </span>
            <div className="flex h-7 flex-1 overflow-hidden rounded-sm">
              {MODES.map(({ key, label, color }) => {
                const pct = driver[key as ModeKey] as number;
                if (pct <= 0) return null;
                return (
                  <div
                    key={key}
                    className="relative flex items-center justify-center"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: color,
                      opacity: 0.8,
                    }}
                    title={`${label}: ${pct}%`}
                  >
                    {pct >= 10 && (
                      <span className="text-[9px] font-bold text-black/70 sm:text-[10px]">
                        {pct}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* DRS usage stat */}
      {showDrs && (
        <div className="mt-3 flex items-center gap-4 border-t border-white/5 pt-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            DRS Usage
          </span>
          {data.map((driver) => (
            <span
              key={driver.driverNumber}
              className="text-xs font-medium"
              style={{ color: driver.teamColor }}
            >
              {driver.abbreviation}:{" "}
              <span className="text-white/70">
                {driver.drsUsage !== null ? `${driver.drsUsage}%` : "N/A"}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/50">
        {MODES.map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: color }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
