"use client";

import { useState, useEffect, useMemo } from "react";
import CompareStatBar from "./CompareStatBar";

interface GridDriver {
  id: string;
  name: string;
  teamColor: string;
}

interface SeasonStat {
  year: number;
  races: number;
  wins: number;
  podiums: number;
  points: number;
  bestFinish: number;
  dnfs: number;
}

interface SeasonCompareProps {
  gridDrivers: GridDriver[];
}

export default function SeasonCompare({ gridDrivers }: SeasonCompareProps) {
  const [driverAId, setDriverAId] = useState(gridDrivers[0]?.id ?? "");
  const [driverBId, setDriverBId] = useState(gridDrivers[1]?.id ?? "");
  const [statsA, setStatsA] = useState<SeasonStat[]>([]);
  const [statsB, setStatsB] = useState<SeasonStat[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const driverA = gridDrivers.find((d) => d.id === driverAId);
  const driverB = gridDrivers.find((d) => d.id === driverBId);

  // Fetch stats when drivers change
  useEffect(() => {
    if (!driverAId || !driverBId || driverAId === driverBId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/driver/${driverAId}/stats`).then((r) => {
        if (!r.ok) throw new Error(`Failed to load stats for driver A`);
        return r.json() as Promise<SeasonStat[]>;
      }),
      fetch(`/api/driver/${driverBId}/stats`).then((r) => {
        if (!r.ok) throw new Error(`Failed to load stats for driver B`);
        return r.json() as Promise<SeasonStat[]>;
      }),
    ])
      .then(([a, b]) => {
        if (cancelled) return;
        setStatsA(a);
        setStatsB(b);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load stats");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [driverAId, driverBId]);

  // Available years = intersection of both drivers' years
  const availableYears = useMemo(() => {
    const yearsA = new Set(statsA.map((s) => s.year));
    const common = statsB
      .map((s) => s.year)
      .filter((y) => yearsA.has(y))
      .sort((a, b) => b - a);
    return common;
  }, [statsA, statsB]);

  // Auto-select most recent common year
  useEffect(() => {
    if (availableYears.length > 0) {
      setSelectedYear((prev) =>
        prev && availableYears.includes(prev) ? prev : availableYears[0],
      );
    } else {
      setSelectedYear(null);
    }
  }, [availableYears]);

  const yearStatsA = statsA.find((s) => s.year === selectedYear);
  const yearStatsB = statsB.find((s) => s.year === selectedYear);

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

      {loading && (
        <div className="py-12 text-center text-sm text-white/40">
          Loading season stats...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && driverAId !== driverBId && availableYears.length === 0 && statsA.length + statsB.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-sm text-white/40">
            No common seasons found for these two drivers.
          </p>
        </div>
      )}

      {!loading && !error && availableYears.length > 0 && (
        <>
          {/* Year picker */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Season
            </label>
            <select
              value={selectedYear ?? ""}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 sm:w-auto"
            >
              {availableYears.map((y) => (
                <option key={y} value={y} className="bg-[#111]">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Color legend */}
          {driverA && driverB && (
            <div className="flex items-center justify-center gap-8">
              <span className="flex items-center gap-2 text-sm font-medium text-white/70">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: driverA.teamColor }}
                />
                {driverA.name}
              </span>
              <span className="flex items-center gap-2 text-sm font-medium text-white/70">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: driverB.teamColor }}
                />
                {driverB.name}
              </span>
            </div>
          )}

          {/* Stat bars */}
          {yearStatsA && yearStatsB && driverA && driverB && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
                {selectedYear} Season Comparison
              </h3>

              {/* Driver name headers */}
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
                  label="Races"
                  valueA={yearStatsA.races}
                  valueB={yearStatsB.races}
                  colorA={driverA.teamColor}
                  colorB={driverB.teamColor}
                />
                <CompareStatBar
                  label="Wins"
                  valueA={yearStatsA.wins}
                  valueB={yearStatsB.wins}
                  colorA={driverA.teamColor}
                  colorB={driverB.teamColor}
                />
                <CompareStatBar
                  label="Podiums"
                  valueA={yearStatsA.podiums}
                  valueB={yearStatsB.podiums}
                  colorA={driverA.teamColor}
                  colorB={driverB.teamColor}
                />
                <CompareStatBar
                  label="Points"
                  valueA={yearStatsA.points}
                  valueB={yearStatsB.points}
                  colorA={driverA.teamColor}
                  colorB={driverB.teamColor}
                />
                <CompareStatBar
                  label="Best Finish"
                  valueA={yearStatsA.bestFinish}
                  valueB={yearStatsB.bestFinish}
                  colorA={driverA.teamColor}
                  colorB={driverB.teamColor}
                  format={(v) => `P${v}`}
                  lowerIsBetter
                />
                <CompareStatBar
                  label="DNFs"
                  valueA={yearStatsA.dnfs}
                  valueB={yearStatsB.dnfs}
                  colorA={driverA.teamColor}
                  colorB={driverB.teamColor}
                  lowerIsBetter
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
