"use client";

import { useState, useEffect } from "react";

interface PitStop {
  driverNumber: number;
  lapNumber: number;
  stopNumber: number | null;
  stationaryTime: string | null;
  stationaryTimeSeconds: number | null;
  pitLaneTime: string | null;
  pitLaneTimeSeconds: number | null;
  driver: {
    driverNumber: number;
    abbreviation: string;
    teamName: string;
    teamColor: string;
  } | null;
}

interface PitStopTableProps {
  sessionKey: number;
}

export default function PitStopTable({ sessionKey }: PitStopTableProps) {
  const [data, setData] = useState<PitStop[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/sessions/${sessionKey}/pit-stops`, { signal: ac.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((e) => { if (!ac.signal.aborted) setError("Failed to load pit stop data"); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [sessionKey]);

  if (loading) {
    return <p className="py-8 text-center text-sm text-white/40">Loading pit stops...</p>;
  }

  if (error || !data) {
    return <p className="py-8 text-center text-sm text-red-400">{error ?? "No data"}</p>;
  }

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-white/30">No pit stop data available</p>;
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        Pit Stops
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/30">
              <th className="pb-2 pr-3 font-medium">Driver</th>
              <th className="pb-2 pr-3 text-right font-medium">Stop</th>
              <th className="pb-2 pr-3 text-right font-medium">Lap</th>
              <th className="pb-2 pr-3 text-right font-medium">Stationary</th>
              <th className="pb-2 text-right font-medium">Pit Lane</th>
            </tr>
          </thead>
          <tbody>
            {data.map((stop, i) => (
              <tr
                key={`${stop.driverNumber}-${stop.lapNumber}-${i}`}
                className="border-b border-white/5 text-white/70"
              >
                <td className="py-2 pr-3">
                  <span className="flex items-center gap-2">
                    {stop.driver && (
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: `#${stop.driver.teamColor}` }}
                      />
                    )}
                    <span className="font-medium text-white">
                      {stop.driver?.abbreviation ?? `#${stop.driverNumber}`}
                    </span>
                  </span>
                </td>
                <td className="py-2 pr-3 text-right font-mono text-xs">
                  {stop.stopNumber ?? "—"}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-xs">
                  {stop.lapNumber}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-xs">
                  {stop.stationaryTime ?? "—"}
                </td>
                <td className="py-2 text-right font-mono text-xs">
                  {stop.pitLaneTime ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
