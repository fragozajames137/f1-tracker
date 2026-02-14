"use client";

import { useState, useEffect, useMemo } from "react";
import { COMPOUNDS, formatLapTime, formatSector } from "@/app/lib/format";
import ShareCard from "../shared/ShareCard";

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
  isNew: boolean | null;
  tyresNotChanged: boolean | null;
  startLap: number | null;
  endLap: number | null;
  totalLaps: number | null;
}

interface PitStop {
  driverNumber: number;
  lapNumber: number;
  stopNumber: number | null;
  stationaryTime: string | null;
  stationaryTimeSeconds: number | null;
  pitLaneTime: string | null;
  pitLaneTimeSeconds: number | null;
}

interface StrategyData {
  drivers: DriverInfo[];
  stints: Stint[];
  pitStops: PitStop[];
}

interface LapData {
  lapNumber: number;
  lapTimeSeconds: number | null;
  sector1Seconds: number | null;
  sector2Seconds: number | null;
  sector3Seconds: number | null;
  speedTrap: number | null;
  compound: string | null;
  tyreAge: number | null;
  isPit: boolean | null;
  isOutLap: boolean | null;
  isInLap: boolean | null;
  isPersonalBest: boolean | null;
}

interface StrategyChartProps {
  sessionKey: number;
}

export default function StrategyChart({ sessionKey }: StrategyChartProps) {
  const [data, setData] = useState<StrategyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStint, setExpandedStint] = useState<string | null>(null);
  const [stintLaps, setStintLaps] = useState<LapData[]>([]);
  const [stintLapsLoading, setStintLapsLoading] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/sessions/${sessionKey}/strategy`, { signal: ac.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((e) => { if (!ac.signal.aborted) setError("Failed to load strategy data"); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [sessionKey]);

  // Compute undercut/overcut labels
  const undercutLabels = useMemo(() => {
    if (!data) return [];
    const labels: Array<{
      driverA: string;
      driverB: string;
      lap: number;
      type: "Undercut" | "Overcut";
    }> = [];

    const driversByPosition = [...data.drivers].sort(
      (a, b) => (a.finalPosition ?? 99) - (b.finalPosition ?? 99),
    );

    // For each pair of adjacent finishers, check if pit stop ordering swapped them
    for (let i = 0; i < driversByPosition.length - 1; i++) {
      const driverA = driversByPosition[i];
      const driverB = driversByPosition[i + 1];

      const stopsA = data.pitStops
        .filter((p) => p.driverNumber === driverA.driverNumber)
        .sort((a, b) => a.lapNumber - b.lapNumber);
      const stopsB = data.pitStops
        .filter((p) => p.driverNumber === driverB.driverNumber)
        .sort((a, b) => a.lapNumber - b.lapNumber);

      // Check first stops for undercut/overcut
      if (stopsA.length > 0 && stopsB.length > 0) {
        const diff = stopsA[0].lapNumber - stopsB[0].lapNumber;
        if (diff < 0 && Math.abs(diff) <= 3) {
          labels.push({
            driverA: driverA.abbreviation,
            driverB: driverB.abbreviation,
            lap: stopsA[0].lapNumber,
            type: "Undercut",
          });
        } else if (diff > 0 && Math.abs(diff) <= 3) {
          labels.push({
            driverA: driverA.abbreviation,
            driverB: driverB.abbreviation,
            lap: stopsB[0].lapNumber,
            type: "Overcut",
          });
        }
      }
    }

    return labels;
  }, [data]);

  // Load stint lap data when a stint is expanded
  function handleStintClick(driverNumber: number, stintNumber: number, startLap: number | null, endLap: number | null) {
    const key = `${driverNumber}-${stintNumber}`;
    if (expandedStint === key) {
      setExpandedStint(null);
      setStintLaps([]);
      return;
    }

    setExpandedStint(key);
    setStintLapsLoading(true);

    const from = startLap ?? 1;
    const to = endLap ?? from + 10;

    fetch(
      `/api/sessions/${sessionKey}/laps?driver=${driverNumber}&from=${from}&to=${to}`,
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((laps: LapData[]) => {
        setStintLaps(laps);
      })
      .catch(() => setStintLaps([]))
      .finally(() => setStintLapsLoading(false));
  }

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
    ...data.stints.map((s) => s.endLap ?? 0).filter((l) => l > 0),
    1,
  );

  // Map pit stops by driver
  const pitStopsByDriver = new Map<number, PitStop[]>();
  for (const ps of data.pitStops) {
    if (!pitStopsByDriver.has(ps.driverNumber)) {
      pitStopsByDriver.set(ps.driverNumber, []);
    }
    pitStopsByDriver.get(ps.driverNumber)!.push(ps);
  }

  return (
    <ShareCard title="Tire Strategy" subtitle="Stint breakdown by driver">
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
          Tire Strategy
        </h3>
        <div className="space-y-1">
          {data.drivers.map((driver) => {
            const driverStints = data.stints
              .filter((s) => s.driverNumber === driver.driverNumber)
              .sort((a, b) => a.stintNumber - b.stintNumber);
            const driverPitStops = pitStopsByDriver.get(driver.driverNumber) ?? [];
            const driverUndercutLabels = undercutLabels.filter(
              (l) => l.driverA === driver.abbreviation || l.driverB === driver.abbreviation,
            );

            if (driverStints.length === 0) return null;

            return (
              <div key={driver.driverNumber}>
                <div className="flex items-center gap-2">
                  <span className="w-8 shrink-0 text-right text-[10px] font-semibold text-white/70 sm:w-10 sm:text-xs">
                    {driver.abbreviation}
                  </span>
                  <div className="relative flex flex-1 gap-px">
                    {driverStints.map((stint, idx) => {
                      const start = stint.startLap ?? 1;
                      const end = stint.endLap ?? start;
                      const stintLapCount = end - start + 1;
                      const width = (stintLapCount / maxLap) * 100;
                      const compound = (stint.compound ?? "UNKNOWN").toUpperCase();
                      const color = COMPOUNDS[compound]?.hex ?? COMPOUNDS.UNKNOWN.hex;
                      const stintKey = `${driver.driverNumber}-${stint.stintNumber}`;
                      const isExpanded = expandedStint === stintKey;

                      // Find pit stop at the end of this stint
                      const pitStop = idx < driverStints.length - 1
                        ? driverPitStops.find(
                            (ps) => Math.abs(ps.lapNumber - end) <= 1,
                          )
                        : null;

                      return (
                        <div key={stint.stintNumber} className="relative" style={{ width: `${width}%` }}>
                          <button
                            onClick={() =>
                              handleStintClick(
                                driver.driverNumber,
                                stint.stintNumber,
                                stint.startLap,
                                stint.endLap,
                              )
                            }
                            className={`relative h-5 w-full cursor-pointer rounded-sm sm:h-6 ${
                              isExpanded ? "ring-1 ring-white/40" : ""
                            }`}
                            style={{
                              background: `linear-gradient(to right, ${color}, ${color}dd, ${color}99)`,
                              opacity: 0.8,
                            }}
                            title={`${stint.compound ?? "Unknown"}${stint.isNew === false ? " (Used)" : ""} | Laps ${start}–${end} (${stintLapCount} laps)${stint.tyresNotChanged ? " | Tyres not changed" : ""}`}
                          >
                            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-black/60 sm:text-[9px]">
                              {stintLapCount > 3
                                ? `${(stint.compound ?? "?").charAt(0)} ${stintLapCount}`
                                : (stint.compound ?? "?").charAt(0)}
                            </span>
                            {stint.isNew === false && (
                              <span className="absolute -top-1.5 left-0.5 text-[7px] font-bold text-white/60">U</span>
                            )}
                          </button>

                          {/* Pit stop duration marker */}
                          {pitStop && (pitStop.stationaryTime || pitStop.pitLaneTime) && (
                            <span className="absolute -bottom-3.5 right-0 text-[8px] font-semibold text-white/40" title={pitStop.pitLaneTime ? `Pit lane: ${pitStop.pitLaneTime}s` : undefined}>
                              {pitStop.stationaryTime ?? pitStop.pitLaneTime}s
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Undercut/overcut label */}
                  {driverUndercutLabels.length > 0 && (
                    <span className="shrink-0 text-[9px] font-semibold text-emerald-400/70">
                      {driverUndercutLabels[0].type}
                    </span>
                  )}
                </div>

                {/* Expanded stint lap times */}
                {expandedStint?.startsWith(`${driver.driverNumber}-`) && (
                  <div className="ml-10 mt-1 mb-2 rounded border border-white/10 bg-white/[0.03] p-2 sm:ml-12">
                    {stintLapsLoading ? (
                      <p className="text-xs text-white/30">Loading lap times...</p>
                    ) : stintLaps.length === 0 ? (
                      <p className="text-xs text-white/30">No lap time data</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px] font-mono">
                          <thead>
                            <tr className="text-white/30">
                              <th className="pb-1 pr-2 text-left font-medium">Lap</th>
                              <th className="pb-1 pr-2 text-right font-medium">Time</th>
                              <th className="hidden pb-1 pr-2 text-right font-medium sm:table-cell">S1</th>
                              <th className="hidden pb-1 pr-2 text-right font-medium sm:table-cell">S2</th>
                              <th className="hidden pb-1 pr-2 text-right font-medium sm:table-cell">S3</th>
                              <th className="hidden pb-1 pr-2 text-right font-medium md:table-cell">Speed</th>
                              <th className="hidden pb-1 text-right font-medium md:table-cell">Tyre</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stintLaps.map((lap) => (
                              <tr
                                key={lap.lapNumber}
                                className={`${
                                  lap.isPersonalBest
                                    ? "text-green-400"
                                    : lap.isInLap || lap.isOutLap
                                      ? "text-white/30"
                                      : "text-white/50"
                                }`}
                              >
                                <td className="pr-2 text-left">
                                  L{lap.lapNumber}
                                  {lap.isPit && <span className="ml-0.5 text-yellow-400/60">P</span>}
                                  {lap.isOutLap && <span className="ml-0.5 text-white/30">out</span>}
                                </td>
                                <td className="pr-2 text-right">
                                  {formatLapTime(lap.lapTimeSeconds)}
                                  {lap.isPersonalBest && <span className="ml-0.5 text-green-400/60">*</span>}
                                </td>
                                <td className="hidden pr-2 text-right sm:table-cell">{formatSector(lap.sector1Seconds)}</td>
                                <td className="hidden pr-2 text-right sm:table-cell">{formatSector(lap.sector2Seconds)}</td>
                                <td className="hidden pr-2 text-right sm:table-cell">{formatSector(lap.sector3Seconds)}</td>
                                <td className="hidden pr-2 text-right md:table-cell">
                                  {lap.speedTrap ? `${lap.speedTrap.toFixed(0)}` : "—"}
                                </td>
                                <td className="hidden text-right md:table-cell">
                                  {lap.tyreAge !== null ? `${lap.tyreAge}L` : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pit stop time row */}
        <div className="mt-5 border-t border-white/10 pt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
            Click a stint to expand lap times
          </p>
        </div>

        {/* Compound legend */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/50">
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
    </ShareCard>
  );
}
