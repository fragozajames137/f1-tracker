"use client";

import { useEffect, useState } from "react";

interface RaceResult {
  round: number;
  raceName: string;
  location: string | null;
  country: string | null;
  date: string | null;
  gridPosition: number | null;
  finalPosition: number | null;
  status: string | null;
  points: number | null;
  bestLapTime: string | null;
  pitCount: number | null;
}

interface RaceResultsTabProps {
  driverId: string;
  teamColor: string;
}

export default function RaceResultsTab({ driverId, teamColor }: RaceResultsTabProps) {
  const [results, setResults] = useState<RaceResult[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = selectedYear
      ? `/api/driver/${driverId}/results?year=${selectedYear}`
      : `/api/driver/${driverId}/results`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results ?? []);
        if (data.years?.length && !years.length) {
          setYears(data.years);
          if (!selectedYear && data.years[0]) setSelectedYear(data.years[0]);
        }
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [driverId, selectedYear]);

  return (
    <div>
      {/* Year selector */}
      {years.length > 0 && (
        <div className="mb-4 flex gap-2 flex-wrap">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                y === selectedYear
                  ? "text-white"
                  : "border border-white/10 text-white/40 hover:text-white/70"
              }`}
              style={y === selectedYear ? { backgroundColor: teamColor } : undefined}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <p className="text-sm text-white/30 italic">No race results available yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-white/40 uppercase tracking-wider">
                <th className="pb-2 pr-3">Rd</th>
                <th className="pb-2 pr-3">Race</th>
                <th className="pb-2 pr-3 text-right">Grid</th>
                <th className="pb-2 pr-3 text-right">Finish</th>
                <th className="pb-2 pr-3 text-right">Pts</th>
                <th className="pb-2 pr-3 text-right">Best Lap</th>
                <th className="pb-2 text-right">Pits</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const isDNF = r.status && !r.status.includes("Finished") && !r.status.includes("Lap");
                return (
                  <tr key={r.round} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 pr-3 font-mono text-white/40">{r.round}</td>
                    <td className="py-2 pr-3 text-white/80">
                      {r.raceName}
                      {r.country && (
                        <span className="ml-1.5 text-xs text-white/30">{r.country}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-white/50">
                      {r.gridPosition ?? "—"}
                    </td>
                    <td
                      className={`py-2 pr-3 text-right font-mono font-medium ${
                        isDNF
                          ? "text-red-400"
                          : r.finalPosition === 1
                            ? "text-yellow-400"
                            : r.finalPosition && r.finalPosition <= 3
                              ? "text-white"
                              : "text-white/60"
                      }`}
                    >
                      {isDNF ? "DNF" : r.finalPosition ? `P${r.finalPosition}` : "—"}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-white/60">
                      {r.points ?? 0}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-white/40 text-xs">
                      {r.bestLapTime ?? "—"}
                    </td>
                    <td className="py-2 text-right font-mono text-white/40">
                      {r.pitCount ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
