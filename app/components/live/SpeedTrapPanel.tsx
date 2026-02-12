"use client";

import { memo, useMemo } from "react";
import type { OpenF1Lap, OpenF1Driver } from "@/app/types/openf1";

interface SpeedTrapPanelProps {
  laps: OpenF1Lap[];
  drivers: OpenF1Driver[];
}

interface SpeedTrapEntry {
  driverNumber: number;
  abbreviation: string;
  teamColor: string;
  speed: number;
}

function getSpeedColor(speed: number): string {
  if (speed >= 320) return "#ef4444"; // red — very high
  if (speed >= 300) return "#f97316"; // orange — high
  if (speed >= 280) return "#eab308"; // yellow — medium
  return "#22c55e"; // green — lower
}

export default memo(function SpeedTrapPanel({
  laps,
  drivers,
}: SpeedTrapPanelProps) {
  const entries = useMemo((): SpeedTrapEntry[] => {
    const latestByDriver = new Map<number, number>();

    // Walk laps in order — keep the latest non-null st_speed per driver
    for (const lap of laps) {
      if (lap.st_speed !== null) {
        latestByDriver.set(lap.driver_number, lap.st_speed);
      }
    }

    const result: SpeedTrapEntry[] = [];
    for (const [driverNumber, speed] of latestByDriver) {
      const driver = drivers.find((d) => d.driver_number === driverNumber);
      result.push({
        driverNumber,
        abbreviation: driver?.name_acronym ?? `#${driverNumber}`,
        teamColor: driver ? `#${driver.team_colour}` : "#666",
        speed,
      });
    }

    return result.sort((a, b) => b.speed - a.speed);
  }, [laps, drivers]);

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          Speed Trap
        </h3>
        <p className="text-sm text-white/30">No speed trap data</p>
      </div>
    );
  }

  const maxSpeed = entries[0].speed;
  const minSpeed = entries[entries.length - 1].speed;
  const range = maxSpeed - minSpeed || 1;

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
        Speed Trap
      </h3>
      <div className="space-y-1.5">
        {entries.map((entry, i) => {
          // Bar width: fastest = 100%, slowest = 30% minimum for readability
          const pct = range > 0
            ? 30 + ((entry.speed - minSpeed) / range) * 70
            : 100;

          return (
            <div key={entry.driverNumber} className="flex items-center gap-2">
              <span
                className="w-8 shrink-0 text-right text-[10px] font-semibold"
                style={{ color: entry.teamColor }}
              >
                {entry.abbreviation}
              </span>
              <div className="relative h-5 flex-1 overflow-hidden rounded-sm bg-white/5">
                <div
                  className="absolute inset-y-0 left-0 rounded-sm transition-[width] duration-300"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: getSpeedColor(entry.speed),
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
                  {entry.speed}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-right text-[10px] text-white/20">km/h</div>
    </div>
  );
});
