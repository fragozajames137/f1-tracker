"use client";

import { memo } from "react";
import { OpenF1Lap, OpenF1Driver } from "@/app/types/openf1";
import { formatLapTime, formatSector } from "@/app/lib/format";

interface LapTimesPanelProps {
  laps: OpenF1Lap[];
  driver: OpenF1Driver | null;
}

export default memo(function LapTimesPanel({ laps, driver }: LapTimesPanelProps) {
  if (!driver) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          Lap Times
        </h3>
        <p className="text-sm text-white/30">Select a driver to see lap times</p>
      </div>
    );
  }

  const validLaps = laps
    .filter((l) => l.lap_duration !== null)
    .slice(-15)
    .reverse();

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
        Lap Times — {driver.name_acronym}
      </h3>
      {validLaps.length === 0 ? (
        <p className="text-sm text-white/30">No lap data yet</p>
      ) : (
        <div className="max-h-[300px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-white/40">
                <th className="px-2 py-1 font-medium">Lap</th>
                <th className="px-2 py-1 font-medium">Time</th>
                <th className="hidden px-2 py-1 font-medium sm:table-cell">S1</th>
                <th className="hidden px-2 py-1 font-medium sm:table-cell">S2</th>
                <th className="hidden px-2 py-1 font-medium sm:table-cell">S3</th>
              </tr>
            </thead>
            <tbody>
              {validLaps.map((lap) => (
                <tr
                  key={lap.lap_number}
                  className="border-b border-white/5"
                >
                  <td className="px-2 py-2 font-mono text-white/60 sm:py-1">
                    {lap.lap_number}
                  </td>
                  <td className="px-2 py-2 font-mono font-medium text-white sm:py-1">
                    {formatLapTime(lap.lap_duration)}
                  </td>
                  <td className="hidden px-2 py-2 font-mono text-white/60 sm:table-cell sm:py-1">
                    {formatSector(lap.duration_sector_1)}
                  </td>
                  <td className="hidden px-2 py-2 font-mono text-white/60 sm:table-cell sm:py-1">
                    {formatSector(lap.duration_sector_2)}
                  </td>
                  <td className="hidden px-2 py-2 font-mono text-white/60 sm:table-cell sm:py-1">
                    {formatSector(lap.duration_sector_3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
})
