"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import { usePreferencesStore } from "@/app/stores/preferences";

const MONO_FONT = "'Space Mono', ui-monospace, monospace";

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

interface SparklinePoint {
  round: number;
  avg: number;
}

interface TeamStop {
  stationaryTimeSeconds: number;
  pitLaneTimeSeconds: number | null;
  abbreviation: string;
  meetingName: string;
  round: number;
  lapNumber: number;
  stopNumber: number | null;
}

interface TeamData {
  teamName: string;
  teamColor: string;
  // Raw stats (all stops)
  avgTime: number;
  bestTime: number;
  medianTime: number;
  totalStops: number;
  consistency: number;
  sparkline: SparklinePoint[];
  // Clean stats (outliers excluded)
  cleanAvgTime: number;
  cleanBestTime: number;
  cleanMedianTime: number;
  cleanStops: number;
  cleanConsistency: number;
  sparklineClean: SparklinePoint[];
  // Outlier info
  outlierCount: number;
  longestStop: number | null;
  stops: TeamStop[];
}

interface BestStop {
  stationaryTime: number;
  pitLaneTime: number | null;
  abbreviation: string;
  teamName: string;
  teamColor: string;
  meetingName: string;
  round: number;
  lapNumber: number;
}

interface SeasonData {
  teams: TeamData[];
  bestStops: BestStop[];
}

interface PitCrewLeaderboardProps {
  year: number;
  availableYears?: number[];
}

function Sparkline({ data, color }: { data: SparklinePoint[]; color: string }) {
  if (data.length < 2) return <span className="text-xs text-white/20">—</span>;

  const minY = Math.min(...data.map((d) => d.avg)) - 0.1;
  const maxY = Math.max(...data.map((d) => d.avg)) + 0.1;

  return (
    <ResponsiveContainer width={80} height={24}>
      <LineChart data={data}>
        <YAxis domain={[minY, maxY]} hide />
        <Line
          type="monotone"
          dataKey="avg"
          stroke={`#${color}`}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function PitCrewLeaderboard({ year, availableYears }: PitCrewLeaderboardProps) {
  const [selectedYear, setSelectedYear] = useState(year);
  const [data, setData] = useState<SeasonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [excludeOutliers, setExcludeOutliers] = useState(true);
  const favoriteTeamId = usePreferencesStore((s) => s.favoriteTeamId);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    setExpandedTeam(null);
    fetch(`/api/pit-stops/season?year=${selectedYear}`, { signal: ac.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => {
        if (!ac.signal.aborted) setError("Failed to load pit crew data");
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [selectedYear]);

  const sortedTeams = useMemo(() => {
    if (!data?.teams.length) return [];
    return [...data.teams].sort((a, b) =>
      excludeOutliers
        ? a.cleanAvgTime - b.cleanAvgTime
        : a.avgTime - b.avgTime,
    );
  }, [data, excludeOutliers]);

  const fastestAvg = useMemo(() => {
    if (!sortedTeams.length) return 0;
    return excludeOutliers ? sortedTeams[0].cleanAvgTime : sortedTeams[0].avgTime;
  }, [sortedTeams, excludeOutliers]);

  const years = availableYears ?? [year];

  // Year selector shown above content (even while loading)
  const yearSelector = years.length > 1 ? (
    <div className="mb-6 flex items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-white/40">
        Season
      </span>
      <div className="flex overflow-hidden rounded-lg border border-white/10">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            className={`cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedYear === y
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {y}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  if (loading) {
    return (
      <>
        {yearSelector}
        <p className="py-12 text-center text-sm text-white/40">
          Loading pit crew data...
        </p>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        {yearSelector}
        <p className="py-12 text-center text-sm text-red-400">
          {error ?? "No data"}
        </p>
      </>
    );
  }

  if (data.teams.length === 0) {
    return (
      <>
        {yearSelector}
        <p className="py-12 text-center text-sm text-white/30">
          No pit stop data available for {selectedYear}
        </p>
      </>
    );
  }

  return (
    <div className="space-y-8">
      {yearSelector}

      {/* Team Rankings */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Pit Crew Rankings — {selectedYear}
          </h3>
          <button
            onClick={() => setExcludeOutliers((v) => !v)}
            className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              excludeOutliers
                ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
                : "border-white/10 text-white/40 hover:text-white/60"
            }`}
          >
            {excludeOutliers ? "Outliers excluded" : "Include outliers"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/30">
                <th className="pb-2 pr-3 font-medium w-8">#</th>
                <th className="pb-2 pr-3 font-medium">Team</th>
                <th className="pb-2 pr-3 text-right font-medium">Avg</th>
                <th className="pb-2 pr-3 text-right font-medium">Best</th>
                <th className="hidden pb-2 pr-3 text-right font-medium sm:table-cell">
                  Median
                </th>
                <th className="hidden pb-2 pr-3 text-right font-medium sm:table-cell">
                  Stops
                </th>
                <th className="hidden pb-2 pr-3 text-right font-medium md:table-cell">
                  Consistency
                </th>
                <th className="hidden pb-2 pr-3 text-right font-medium md:table-cell">
                  Outliers
                </th>
                <th className="hidden pb-2 pr-3 text-right font-medium lg:table-cell">
                  Longest
                </th>
                <th className="hidden pb-2 pr-3 font-medium md:table-cell">Trend</th>
                <th className="pb-2 pr-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team, i) => {
                const isFav =
                  favoriteTeamId !== null &&
                  nameToSlug(team.teamName).startsWith(favoriteTeamId);
                const isExpanded = expandedTeam === team.teamName;
                const avg = excludeOutliers ? team.cleanAvgTime : team.avgTime;
                const best = excludeOutliers ? team.cleanBestTime : team.bestTime;
                const median = excludeOutliers ? team.cleanMedianTime : team.medianTime;
                const stops = excludeOutliers ? team.cleanStops : team.totalStops;
                const cons = excludeOutliers ? team.cleanConsistency : team.consistency;
                const spark = excludeOutliers ? team.sparklineClean : team.sparkline;
                const barWidth =
                  fastestAvg > 0 ? (fastestAvg / avg) * 100 : 100;

                return (
                  <tr
                    key={team.teamName}
                    className={`border-b border-white/5 text-white/70 ${isFav ? "bg-white/[0.03]" : ""}`}
                  >
                    <td className="py-2.5 pr-3 font-mono text-xs text-white/30">
                      {i + 1}
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: `#${team.teamColor}` }}
                        />
                        <span className="font-medium text-white">
                          {team.teamName}
                        </span>
                      </div>
                      {/* Mini bar indicator */}
                      <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: `#${team.teamColor}`,
                            opacity: 0.6,
                          }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-xs text-white">
                      {avg.toFixed(3)}s
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-xs">
                      {best.toFixed(3)}s
                    </td>
                    <td className="hidden py-2.5 pr-3 text-right font-mono text-xs sm:table-cell">
                      {median.toFixed(3)}s
                    </td>
                    <td className="hidden py-2.5 pr-3 text-right font-mono text-xs sm:table-cell">
                      {stops}
                    </td>
                    <td className="hidden py-2.5 pr-3 text-right font-mono text-xs md:table-cell">
                      <span
                        className={
                          cons < 0.3
                            ? "text-green-400"
                            : cons < 0.6
                              ? "text-amber-400"
                              : "text-red-400"
                        }
                      >
                        {"\u00B1"}{cons.toFixed(3)}s
                      </span>
                    </td>
                    <td className="hidden py-2.5 pr-3 text-right font-mono text-xs md:table-cell">
                      {team.outlierCount > 0 ? (
                        <span className="text-red-400">{team.outlierCount}</span>
                      ) : (
                        <span className="text-white/20">0</span>
                      )}
                    </td>
                    <td className="hidden py-2.5 pr-3 text-right font-mono text-xs lg:table-cell">
                      {team.longestStop !== null ? (
                        <span className="text-red-400/70">
                          {team.longestStop.toFixed(1)}s
                        </span>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>
                    <td className="hidden py-2.5 pr-3 md:table-cell">
                      <Sparkline data={spark} color={team.teamColor} />
                    </td>
                    <td className="py-2.5 pr-3">
                      <button
                        onClick={() =>
                          setExpandedTeam(isExpanded ? null : team.teamName)
                        }
                        className="cursor-pointer text-xs text-white/30 hover:text-white/70"
                      >
                        {isExpanded ? "Hide" : "Detail"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Expanded team detail */}
        {expandedTeam && (() => {
          const team = sortedTeams.find((t) => t.teamName === expandedTeam);
          if (!team) return null;

          // Group stops by race
          const byRace = new Map<number, TeamStop[]>();
          for (const stop of team.stops) {
            if (!byRace.has(stop.round)) byRace.set(stop.round, []);
            byRace.get(stop.round)!.push(stop);
          }

          return (
            <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: `#${team.teamColor}` }}
                />
                {team.teamName} — All Stops
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/30">
                      <th className="pb-2 pr-3 font-medium">Race</th>
                      <th className="pb-2 pr-3 font-medium">Driver</th>
                      <th className="pb-2 pr-3 text-right font-medium">Stop</th>
                      <th className="pb-2 pr-3 text-right font-medium">Lap</th>
                      <th className="pb-2 text-right font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(byRace.entries())
                      .sort(([a], [b]) => a - b)
                      .flatMap(([round, stops]) =>
                        stops
                          .sort((a, b) => a.lapNumber - b.lapNumber)
                          .map((stop, i) => (
                            <tr
                              key={`${round}-${stop.abbreviation}-${stop.lapNumber}`}
                              className={`border-b border-white/5 text-white/70 ${stop.stationaryTimeSeconds > 10 ? "bg-red-500/[0.04]" : ""}`}
                            >
                              {i === 0 ? (
                                <td
                                  className="py-1.5 pr-3 text-xs text-white/50"
                                  rowSpan={stops.length}
                                >
                                  R{round} {stop.meetingName.replace(" Grand Prix", "")}
                                </td>
                              ) : null}
                              <td className="py-1.5 pr-3 font-mono text-xs">
                                {stop.abbreviation}
                              </td>
                              <td className="py-1.5 pr-3 text-right font-mono text-xs">
                                {stop.stopNumber ?? "—"}
                              </td>
                              <td className="py-1.5 pr-3 text-right font-mono text-xs">
                                {stop.lapNumber}
                              </td>
                              <td className={`py-1.5 text-right font-mono text-xs ${stop.stationaryTimeSeconds > 10 ? "text-red-400" : ""}`}>
                                {stop.stationaryTimeSeconds.toFixed(3)}s
                              </td>
                            </tr>
                          )),
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Best Stops of the Season */}
      {data.bestStops.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
            Fastest Pit Stops of {selectedYear}
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/30">
                  <th className="pb-2 pr-3 font-medium w-8">#</th>
                  <th className="pb-2 pr-3 font-medium">Driver</th>
                  <th className="pb-2 pr-3 font-medium">Team</th>
                  <th className="hidden pb-2 pr-3 font-medium sm:table-cell">Race</th>
                  <th className="hidden pb-2 pr-3 text-right font-medium sm:table-cell">
                    Lap
                  </th>
                  <th className="pb-2 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.bestStops.map((stop, i) => (
                  <tr
                    key={`${stop.abbreviation}-${stop.round}-${stop.lapNumber}`}
                    className={`border-b border-white/5 text-white/70 ${i === 0 ? "bg-amber-400/[0.03]" : ""}`}
                  >
                    <td className="py-2 pr-3 font-mono text-xs text-white/30">
                      {i + 1}
                      {i === 0 && (
                        <span className="ml-1 text-amber-400">&#9733;</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: `#${stop.teamColor}` }}
                        />
                        <span className="font-medium text-white">
                          {stop.abbreviation}
                        </span>
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-xs text-white/50">
                      {stop.teamName}
                    </td>
                    <td className="hidden py-2 pr-3 text-xs text-white/50 sm:table-cell">
                      {stop.meetingName.replace(" Grand Prix", "")}
                    </td>
                    <td className="hidden py-2 pr-3 text-right font-mono text-xs sm:table-cell">
                      {stop.lapNumber}
                    </td>
                    <td
                      className={`py-2 text-right font-mono text-xs ${
                        i === 0 ? "font-semibold text-amber-400" : "text-white"
                      }`}
                    >
                      {stop.stationaryTime.toFixed(3)}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
