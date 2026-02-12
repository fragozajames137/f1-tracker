"use client";

import type { TelemetryStint, TelemetryDriver } from "@/app/types/telemetry";
import { COMPOUNDS, DEGRADATION, FUEL_EFFECT } from "@/app/lib/format";

interface TireStrategyChartProps {
  stints: TelemetryStint[];
  drivers: TelemetryDriver[];
}

export default function TireStrategyChart({
  stints,
  drivers,
}: TireStrategyChartProps) {
  if (stints.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          Tire Strategy
        </h3>
        <p className="text-sm text-white/30">No stint data available</p>
      </div>
    );
  }

  const sortedDrivers = [...drivers].sort(
    (a, b) => (a.position ?? 99) - (b.position ?? 99),
  );

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        Tire Strategy
      </h3>
      <div className="space-y-1">
        {sortedDrivers.map((driver) => {
          const driverStints = stints
            .filter((s) => s.driverNumber === driver.number)
            .sort((a, b) => a.stintNumber - b.stintNumber);

          if (driverStints.length === 0) return null;

          const maxLap = Math.max(...stints.map((s) => s.lapEnd));

          return (
            <div key={driver.number} className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-right text-[10px] font-semibold text-white/70 sm:w-10 sm:text-xs">
                {driver.abbreviation}
              </span>
              <div className="flex flex-1 gap-px">
                {driverStints.map((stint) => {
                  const width =
                    ((stint.lapEnd - stint.lapStart + 1) / maxLap) * 100;
                  const color =
                    COMPOUNDS[stint.compound.toUpperCase()]?.hex ??
                    COMPOUNDS.UNKNOWN.hex;
                  const stintLaps = stint.lapEnd - stint.lapStart + 1;
                  const deg = DEGRADATION[stint.compound.toUpperCase()] ?? 0;
                  const totalDeg = (deg * stintLaps).toFixed(2);

                  return (
                    <div
                      key={stint.stintNumber}
                      className="relative h-5 rounded-sm sm:h-6"
                      style={{
                        width: `${width}%`,
                        background: `linear-gradient(to right, ${color}, ${color}dd, ${color}99)`,
                        opacity: 0.8,
                      }}
                      title={`${stint.compound} | Laps ${stint.lapStart}–${stint.lapEnd} (${stintLaps} laps) | Est. degradation: +${totalDeg}s`}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-black/60 sm:text-[9px]">
                        {stint.compound.charAt(0)}
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
      {/* Degradation legend */}
      <div className="mt-3 rounded border border-white/5 bg-white/[0.02] px-3 py-2">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
          Estimated Degradation (s/lap)
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/40">
          {Object.entries(DEGRADATION).map(([compound, rate]) => {
            const color = COMPOUNDS[compound]?.hex ?? "#666";
            return (
              <span key={compound} className="flex items-center gap-1">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {compound.charAt(0) + compound.slice(1).toLowerCase()}: +{rate}s
              </span>
            );
          })}
          <span className="text-white/30">
            Fuel effect: −{FUEL_EFFECT.perLap}s/lap
          </span>
        </div>
      </div>
    </div>
  );
}
