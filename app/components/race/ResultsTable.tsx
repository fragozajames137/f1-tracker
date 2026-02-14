"use client";

import { useState, useEffect } from "react";

interface DriverResult {
  driverNumber: number;
  abbreviation: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  teamName: string | null;
  teamColor: string | null;
  countryCode: string | null;
  gridPosition: number | null;
  finalPosition: number | null;
  status: string | null;
  points: number | null;
  bestLapTime: string | null;
  bestLapTimeSeconds: number | null;
  bestLapNumber: number | null;
  speedTrapBest: number | null;
  pitCount: number | null;
}

interface SessionDetail {
  sessionKey: number;
  sessionType: string;
  sessionName: string;
  totalLaps: number | null;
  drivers: DriverResult[];
}

interface ResultsTableProps {
  sessionKey: number;
}

export default function ResultsTable({ sessionKey }: ResultsTableProps) {
  const [data, setData] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/sessions/${sessionKey}`, { signal: ac.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((e) => { if (!ac.signal.aborted) setError("Failed to load results"); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [sessionKey]);

  if (loading) {
    return <p className="py-8 text-center text-sm text-white/40">Loading results...</p>;
  }

  if (error || !data) {
    return <p className="py-8 text-center text-sm text-red-400">{error ?? "No data"}</p>;
  }

  const drivers = data.drivers;

  if (drivers.length === 0) {
    return <p className="py-8 text-center text-sm text-white/30">No results available</p>;
  }

  // Find fastest lap across all drivers
  const fastestLapSeconds = Math.min(
    ...drivers
      .map((d) => d.bestLapTimeSeconds)
      .filter((t): t is number => t !== null && t > 0),
  );

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        Final Classification
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/30">
              <th className="pb-2 pr-3 font-medium">Pos</th>
              <th className="pb-2 pr-3 font-medium">Driver</th>
              <th className="hidden pb-2 pr-3 font-medium sm:table-cell">Team</th>
              <th className="pb-2 pr-3 text-right font-medium">Grid</th>
              <th className="hidden pb-2 pr-3 text-right font-medium sm:table-cell">Stops</th>
              <th className="hidden pb-2 pr-3 text-right font-medium md:table-cell">Best Lap</th>
              <th className="hidden pb-2 pr-3 text-right font-medium lg:table-cell">Top Speed</th>
              <th className="pb-2 pr-3 text-right font-medium">Status</th>
              <th className="pb-2 text-right font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => {
              const posChange = d.gridPosition && d.finalPosition
                ? d.gridPosition - d.finalPosition
                : null;
              const isFastestLap =
                d.bestLapTimeSeconds !== null &&
                d.bestLapTimeSeconds > 0 &&
                d.bestLapTimeSeconds === fastestLapSeconds;

              return (
                <tr
                  key={d.driverNumber}
                  className="border-b border-white/5 text-white/70"
                >
                  <td className="py-2 pr-3 font-mono text-xs text-white/40">
                    {d.finalPosition ?? "—"}
                  </td>
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: d.teamColor ? `#${d.teamColor}` : "#666" }}
                      />
                      <span className="font-medium text-white">
                        {d.abbreviation}
                      </span>
                      <span className="hidden text-white/40 sm:inline">
                        {d.fullName ?? `${d.firstName ?? ""} ${d.lastName ?? ""}`}
                      </span>
                      {posChange !== null && posChange !== 0 && (
                        <span
                          className={`text-[10px] font-semibold ${
                            posChange > 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {posChange > 0 ? `+${posChange}` : posChange}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="hidden py-2 pr-3 text-white/40 sm:table-cell">
                    {d.teamName ?? "—"}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    {d.gridPosition ?? "—"}
                  </td>
                  <td className="hidden py-2 pr-3 text-right font-mono text-xs sm:table-cell">
                    {d.pitCount ?? "—"}
                  </td>
                  <td className="hidden py-2 pr-3 text-right font-mono text-xs md:table-cell">
                    {d.bestLapTime ? (
                      <span className={isFastestLap ? "text-purple-400 font-semibold" : ""}>
                        {d.bestLapTime}
                        {isFastestLap && d.bestLapNumber && (
                          <span className="ml-1 text-[9px] text-purple-400/60">L{d.bestLapNumber}</span>
                        )}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="hidden py-2 pr-3 text-right font-mono text-xs lg:table-cell">
                    {d.speedTrapBest ? `${d.speedTrapBest.toFixed(0)} km/h` : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    {d.status ?? "—"}
                  </td>
                  <td className="py-2 text-right font-mono text-xs font-semibold text-white">
                    {d.points && d.points > 0 ? d.points : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
