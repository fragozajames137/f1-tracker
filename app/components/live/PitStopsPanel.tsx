"use client";

import { memo } from "react";
import { OpenF1Pit, OpenF1Driver, OpenF1Stint } from "@/app/types/openf1";
import { COMPOUND_COLORS } from "@/app/lib/format";

interface PitStopsPanelProps {
  pitStops: OpenF1Pit[];
  stints: OpenF1Stint[];
  drivers: OpenF1Driver[];
}

function getDriverAcronym(
  driverNumber: number,
  drivers: OpenF1Driver[],
): string {
  return (
    drivers.find((d) => d.driver_number === driverNumber)?.name_acronym ??
    `#${driverNumber}`
  );
}

function getDriverColor(
  driverNumber: number,
  drivers: OpenF1Driver[],
): string {
  const color = drivers.find(
    (d) => d.driver_number === driverNumber,
  )?.team_colour;
  return color ? `#${color}` : "#666";
}

export default memo(function PitStopsPanel({
  pitStops,
  stints,
  drivers,
}: PitStopsPanelProps) {
  const recentPits = [...pitStops].reverse().slice(0, 20);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
        Pit Stops
      </h3>
      {recentPits.length === 0 ? (
        <p className="text-sm text-white/30">No pit stops yet</p>
      ) : (
        <div className="max-h-[300px] space-y-2 overflow-y-auto">
          {recentPits.map((pit, i) => {
            const stintAfterPit = stints.find(
              (s) =>
                s.driver_number === pit.driver_number &&
                s.lap_start === pit.lap_number + 1,
            );
            const compound = stintAfterPit?.compound ?? "";
            const dotColor =
              COMPOUND_COLORS[compound.toUpperCase()] ?? "bg-white/30";

            return (
              <div
                key={`${pit.driver_number}-${pit.lap_number}-${i}`}
                className="flex items-center gap-3 rounded border border-white/5 bg-white/[0.02] px-3 py-2 text-sm"
              >
                <div
                  className="h-3 w-1 rounded-full"
                  style={{
                    backgroundColor: getDriverColor(
                      pit.driver_number,
                      drivers,
                    ),
                  }}
                />
                <span className="font-semibold text-white">
                  {getDriverAcronym(pit.driver_number, drivers)}
                </span>
                <span className="text-white/40">Lap {pit.lap_number}</span>
                {pit.pit_duration !== null && (
                  <span className="font-mono text-white/70">
                    {pit.pit_duration.toFixed(1)}s
                  </span>
                )}
                {compound && (
                  <div className="flex items-center gap-1">
                    <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                    <span className="text-xs text-white/50">
                      {compound.charAt(0).toUpperCase() +
                        compound.slice(1).toLowerCase()}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
})
