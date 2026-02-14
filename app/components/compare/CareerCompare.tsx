"use client";

import { useState } from "react";
import type { F1HistoricalDriver } from "@/app/types/f1-reference";
import CompareStatBar from "./CompareStatBar";

interface GridDriver {
  id: string;
  name: string;
  teamColor: string;
}

interface CareerCompareProps {
  gridDrivers: GridDriver[];
  historicalDrivers: Record<string, F1HistoricalDriver>;
}

export default function CareerCompare({
  gridDrivers,
  historicalDrivers,
}: CareerCompareProps) {
  const [driverAId, setDriverAId] = useState(gridDrivers[0]?.id ?? "");
  const [driverBId, setDriverBId] = useState(gridDrivers[1]?.id ?? "");

  const driverA = gridDrivers.find((d) => d.id === driverAId);
  const driverB = gridDrivers.find((d) => d.id === driverBId);

  const histA = driverA ? historicalDrivers[driverA.name] : undefined;
  const histB = driverB ? historicalDrivers[driverB.name] : undefined;

  return (
    <div className="space-y-6">
      {/* Driver pickers */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Driver A
          </label>
          <select
            value={driverAId}
            onChange={(e) => setDriverAId(e.target.value)}
            className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
          >
            {gridDrivers.map((d) => (
              <option
                key={d.id}
                value={d.id}
                className="bg-[#111]"
                disabled={d.id === driverBId}
              >
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Driver B
          </label>
          <select
            value={driverBId}
            onChange={(e) => setDriverBId(e.target.value)}
            className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
          >
            {gridDrivers.map((d) => (
              <option
                key={d.id}
                value={d.id}
                className="bg-[#111]"
                disabled={d.id === driverAId}
              >
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {driverAId === driverBId && (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-center">
          <p className="text-sm text-yellow-400">
            Select two different drivers to compare
          </p>
        </div>
      )}

      {driverAId !== driverBId && (!histA || !histB) && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-sm text-white/40">
            Career stats not available for{" "}
            {!histA && driverA ? driverA.name : ""}
            {!histA && !histB && " and "}
            {!histB && driverB ? driverB.name : ""}.
          </p>
        </div>
      )}

      {driverAId !== driverBId && histA && histB && driverA && driverB && (
        <>
          {/* Color legend + nationality/seasons */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-start gap-1">
              <span className="flex items-center gap-2 text-sm font-medium text-white/70">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: driverA.teamColor }}
                />
                {driverA.name}
              </span>
              <span className="ml-5 text-[11px] text-white/30">
                {histA.nationality} &middot; {histA.seasons}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="flex items-center gap-2 text-sm font-medium text-white/70">
                {driverB.name}
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: driverB.teamColor }}
                />
              </span>
              <span className="mr-5 text-[11px] text-white/30">
                {histB.nationality} &middot; {histB.seasons}
              </span>
            </div>
          </div>

          {/* Stat bars */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
              All-Time Career Stats
            </h3>

            <div className="mb-2 flex items-center justify-between px-1">
              <span
                className="text-sm font-bold"
                style={{ color: driverA.teamColor }}
              >
                {driverA.name}
              </span>
              <span
                className="text-sm font-bold"
                style={{ color: driverB.teamColor }}
              >
                {driverB.name}
              </span>
            </div>

            <div className="space-y-2">
              <CompareStatBar
                label="Championships"
                valueA={histA.championships}
                valueB={histB.championships}
                colorA={driverA.teamColor}
                colorB={driverB.teamColor}
              />
              <CompareStatBar
                label="Wins"
                valueA={histA.wins}
                valueB={histB.wins}
                colorA={driverA.teamColor}
                colorB={driverB.teamColor}
              />
              <CompareStatBar
                label="Poles"
                valueA={histA.poles}
                valueB={histB.poles}
                colorA={driverA.teamColor}
                colorB={driverB.teamColor}
              />
              <CompareStatBar
                label="Podiums"
                valueA={histA.podiums}
                valueB={histB.podiums}
                colorA={driverA.teamColor}
                colorB={driverB.teamColor}
              />
              <CompareStatBar
                label="Fastest Laps"
                valueA={histA.fastestLaps}
                valueB={histB.fastestLaps}
                colorA={driverA.teamColor}
                colorB={driverB.teamColor}
              />
              <CompareStatBar
                label="Points"
                valueA={histA.points}
                valueB={histB.points}
                colorA={driverA.teamColor}
                colorB={driverB.teamColor}
                format={(v) => v.toLocaleString()}
              />
              <CompareStatBar
                label="Entries"
                valueA={histA.entries}
                valueB={histB.entries}
                colorA={driverA.teamColor}
                colorB={driverB.teamColor}
              />
              <CompareStatBar
                label="Starts"
                valueA={histA.starts}
                valueB={histB.starts}
                colorA={driverA.teamColor}
                colorB={driverB.teamColor}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
