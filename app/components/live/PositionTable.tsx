"use client";

import { memo } from "react";
import { DriverWithDetails } from "@/app/types/openf1";
import { COMPOUNDS, formatLapTime, formatGap } from "@/app/lib/format";

interface PositionTableProps {
  drivers: DriverWithDetails[];
  selectedDriverNumber: number | null;
  onSelectDriver: (driverNumber: number) => void;
}

export default memo(function PositionTable({
  drivers,
  selectedDriverNumber,
  onSelectDriver,
}: PositionTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs text-white/40">
            <th className="px-2 py-2 font-medium sm:px-3">Pos</th>
            <th className="px-2 py-2 font-medium sm:px-3">Driver</th>
            <th className="hidden px-2 py-2 font-medium sm:table-cell sm:px-3">
              Last Lap
            </th>
            <th className="px-2 py-2 font-medium sm:px-3">Gap</th>
            <th className="px-2 py-2 font-medium sm:px-3">Tire</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((d) => {
            const isSelected =
              selectedDriverNumber === d.driver.driver_number;
            const compound = d.currentStint?.compound ?? "";
            const dotColor =
              COMPOUNDS[compound.toUpperCase()]?.tw ?? "bg-white/30";

            return (
              <tr
                key={d.driver.driver_number}
                onClick={() => onSelectDriver(d.driver.driver_number)}
                className={`cursor-pointer border-b border-white/5 transition-colors hover:bg-white/5 ${
                  isSelected ? "bg-white/10" : ""
                }`}
              >
                <td className="px-2 py-3 font-mono font-bold text-white/80 sm:px-3 sm:py-2">
                  {d.position?.position ?? "—"}
                </td>
                <td className="px-2 py-3 sm:px-3 sm:py-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-1 rounded-full"
                      style={{
                        backgroundColor: d.driver.team_colour
                          ? `#${d.driver.team_colour}`
                          : "#666",
                      }}
                    />
                    <span className="font-semibold text-white">
                      {d.driver.name_acronym}
                    </span>
                    <span className="hidden text-white/40 sm:inline">
                      {d.driver.team_name}
                    </span>
                  </div>
                </td>
                <td className="hidden px-2 py-3 font-mono text-white/70 sm:table-cell sm:px-3 sm:py-2">
                  {formatLapTime(d.lastLap?.lap_duration ?? null)}
                </td>
                <td className="px-2 py-3 font-mono text-white/70 sm:px-3 sm:py-2">
                  {formatGap(d.interval?.gap_to_leader ?? null)}
                </td>
                <td className="px-2 py-3 sm:px-3 sm:py-2">
                  {compound && (
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${dotColor}`}
                      />
                      <span className="text-xs text-white/50">
                        {compound.charAt(0).toUpperCase() +
                          compound.slice(1).toLowerCase()}
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
})
