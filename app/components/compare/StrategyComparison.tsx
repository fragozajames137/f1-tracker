"use client";

import type { DriverMetrics } from "@/app/lib/compare";
import { COMPOUNDS } from "@/app/lib/format";

interface StrategyComparisonProps {
  driverA: DriverMetrics;
  driverB: DriverMetrics;
}

export default function StrategyComparison({
  driverA,
  driverB,
}: StrategyComparisonProps) {
  const maxLap = Math.max(
    ...driverA.stints.map((s) => s.lapEnd),
    ...driverB.stints.map((s) => s.lapEnd),
    1,
  );

  const drivers = [driverA, driverB];

  if (driverA.stints.length === 0 && driverB.stints.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          Strategy Comparison
        </h3>
        <p className="text-sm text-white/30">No stint data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        Strategy Comparison
      </h3>
      <div className="space-y-2">
        {drivers.map((driver) => (
          <div key={driver.driverNumber} className="flex items-center gap-2">
            <span
              className="w-10 shrink-0 text-right text-xs font-semibold"
              style={{ color: driver.teamColor }}
            >
              {driver.abbreviation}
            </span>
            <div className="flex flex-1 gap-px">
              {driver.stints
                .sort((a, b) => a.stintNumber - b.stintNumber)
                .map((stint) => {
                  const width =
                    ((stint.lapEnd - stint.lapStart + 1) / maxLap) * 100;
                  const color =
                    COMPOUNDS[stint.compound.toUpperCase()]?.hex ??
                    COMPOUNDS.UNKNOWN.hex;
                  const stintLaps = stint.lapEnd - stint.lapStart + 1;

                  return (
                    <div
                      key={stint.stintNumber}
                      className="relative h-6 rounded-sm sm:h-7"
                      style={{
                        width: `${width}%`,
                        background: `linear-gradient(to right, ${color}, ${color}dd, ${color}99)`,
                        opacity: 0.8,
                      }}
                      title={`${stint.compound} | Laps ${stint.lapStart}–${stint.lapEnd} (${stintLaps} laps)`}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-black/60 sm:text-[10px]">
                        {stint.compound.charAt(0)}{" "}
                        <span className="hidden sm:inline">
                          ({stintLaps})
                        </span>
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
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
