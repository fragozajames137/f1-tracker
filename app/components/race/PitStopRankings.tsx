"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { usePreferencesStore } from "@/app/stores/preferences";

const MONO_FONT = "'Space Mono', ui-monospace, monospace";

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

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
    fullName: string | null;
    teamName: string;
    teamColor: string;
  } | null;
}

interface PitStopRankingsProps {
  sessionKey: number;
}

type View = "chart" | "table";

export default function PitStopRankings({ sessionKey }: PitStopRankingsProps) {
  const [data, setData] = useState<PitStop[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("chart");
  const favoriteDriverIds = usePreferencesStore((s) => s.favoriteDriverIds);

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
      .catch((e) => {
        if (!ac.signal.aborted) setError("Failed to load pit stop data");
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [sessionKey]);

  const { chartData, fastestTime, driverGroups } = useMemo(() => {
    if (!data || data.length === 0)
      return { chartData: [], fastestTime: null, driverGroups: new Map() };

    // Chart data: sorted by stationary time
    const withTime = data
      .filter((s) => s.stationaryTimeSeconds !== null)
      .sort((a, b) => a.stationaryTimeSeconds! - b.stationaryTimeSeconds!);

    const fastest = withTime[0]?.stationaryTimeSeconds ?? null;

    const chart = withTime.map((stop) => {
      const abbr = stop.driver?.abbreviation ?? `#${stop.driverNumber}`;
      const isFav = stop.driver?.fullName
        ? favoriteDriverIds.includes(nameToSlug(stop.driver.fullName))
        : false;
      return {
        label: `${abbr} Stop ${stop.stopNumber ?? "?"}`,
        abbreviation: abbr,
        stationaryTime: stop.stationaryTimeSeconds!,
        stationaryTimeFormatted: stop.stationaryTime ?? "—",
        pitLaneTime: stop.pitLaneTimeSeconds,
        pitLaneTimeFormatted: stop.pitLaneTime ?? "—",
        lapNumber: stop.lapNumber,
        stopNumber: stop.stopNumber,
        teamColor: stop.driver ? `#${stop.driver.teamColor}` : "#666",
        teamName: stop.driver?.teamName ?? "Unknown",
        isFastest: fastest !== null && Math.abs(stop.stationaryTimeSeconds! - fastest) < 0.001,
        isFavorite: isFav,
      };
    });

    // Group by driver for table view
    const groups = new Map<
      string,
      { abbreviation: string; teamColor: string; teamName: string; stops: PitStop[] }
    >();
    for (const stop of data) {
      const abbr = stop.driver?.abbreviation ?? `#${stop.driverNumber}`;
      if (!groups.has(abbr)) {
        groups.set(abbr, {
          abbreviation: abbr,
          teamColor: stop.driver ? `#${stop.driver.teamColor}` : "#666",
          teamName: stop.driver?.teamName ?? "Unknown",
          stops: [],
        });
      }
      groups.get(abbr)!.stops.push(stop);
    }

    return { chartData: chart, fastestTime: fastest, driverGroups: groups };
  }, [data, favoriteDriverIds]);

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-white/40">
        Loading pit stops...
      </p>
    );
  }

  if (error || !data) {
    return (
      <p className="py-8 text-center text-sm text-red-400">
        {error ?? "No data"}
      </p>
    );
  }

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-white/30">
        No pit stop data available
      </p>
    );
  }

  const chartHeight = Math.max(300, chartData.length * 28);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
          Pit Stops
        </h3>

        {/* View toggle */}
        <div className="flex overflow-hidden rounded-lg border border-white/10">
          <button
            onClick={() => setView("chart")}
            className={`cursor-pointer px-3 py-1 text-xs font-medium transition-colors ${
              view === "chart"
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            Chart
          </button>
          <button
            onClick={() => setView("table")}
            className={`cursor-pointer px-3 py-1 text-xs font-medium transition-colors ${
              view === "table"
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {view === "chart" ? (
        <>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 50, bottom: 4, left: 8 }}
              barCategoryGap="20%"
            >
              <XAxis
                type="number"
                stroke="#666"
                tick={{ fontSize: 10, fill: "#666", fontFamily: MONO_FONT }}
                domain={[0, "auto"]}
                tickFormatter={(v: number) => `${v.toFixed(1)}s`}
              />
              <YAxis
                type="category"
                dataKey="label"
                stroke="transparent"
                tick={{ fontSize: 10, fill: "#999", fontFamily: MONO_FONT }}
                width={100}
              />
              {/* 2.0s reference line */}
              <ReferenceLine
                x={2.0}
                stroke="#22c55e"
                strokeDasharray="4 4"
                strokeOpacity={0.4}
                label={{
                  value: "2.0s",
                  position: "top",
                  fill: "#22c55e",
                  fontSize: 9,
                  fontFamily: MONO_FONT,
                }}
              />
              {/* 3.0s reference line */}
              <ReferenceLine
                x={3.0}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeOpacity={0.4}
                label={{
                  value: "3.0s",
                  position: "top",
                  fill: "#f59e0b",
                  fontSize: 9,
                  fontFamily: MONO_FONT,
                }}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div
                      className="rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2"
                      style={{ fontFamily: MONO_FONT }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: d.teamColor }}
                        />
                        <span className="text-sm font-medium text-white">
                          {d.abbreviation}
                          {d.isFastest && (
                            <span className="ml-1.5 text-amber-400">
                              Fastest
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="mt-1 space-y-0.5 text-xs text-white/60">
                        <p>
                          Stationary:{" "}
                          <span className="text-white">
                            {d.stationaryTimeFormatted}
                          </span>
                        </p>
                        <p>
                          Pit lane:{" "}
                          <span className="text-white">
                            {d.pitLaneTimeFormatted}
                          </span>
                        </p>
                        <p>
                          Lap:{" "}
                          <span className="text-white">{d.lapNumber}</span>
                        </p>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="stationaryTime" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.label}
                    fill={entry.teamColor}
                    fillOpacity={entry.isFastest ? 1 : 0.8}
                    stroke={
                      entry.isFastest
                        ? "#eab308"
                        : entry.isFavorite
                          ? entry.teamColor
                          : "transparent"
                    }
                    strokeWidth={entry.isFastest || entry.isFavorite ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-white/40">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-4 rounded-sm border border-amber-400/60 bg-amber-400/20" />
              Fastest Stop
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 bg-green-500/40" />
              2.0s
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 bg-amber-500/40" />
              3.0s
            </span>
            {fastestTime !== null && (
              <span className="ml-auto text-white/30">
                Fastest: {fastestTime.toFixed(3)}s
              </span>
            )}
          </div>
        </>
      ) : (
        /* Table view — grouped by driver */
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
              {Array.from(driverGroups.values()).map((group) => (
                group.stops.map((stop: PitStop, i: number) => (
                  <tr
                    key={`${stop.driverNumber}-${stop.lapNumber}-${i}`}
                    className="border-b border-white/5 text-white/70"
                  >
                    {i === 0 ? (
                      <td className="py-2 pr-3" rowSpan={group.stops.length}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: group.teamColor }}
                          />
                          <span className="font-medium text-white">
                            {group.abbreviation}
                          </span>
                        </span>
                      </td>
                    ) : null}
                    <td className="py-2 pr-3 text-right font-mono text-xs">
                      {stop.stopNumber ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-xs">
                      {stop.lapNumber}
                    </td>
                    <td
                      className={`py-2 pr-3 text-right font-mono text-xs ${
                        fastestTime !== null && stop.stationaryTimeSeconds !== null && Math.abs(stop.stationaryTimeSeconds - fastestTime) < 0.001
                          ? "font-semibold text-amber-400"
                          : ""
                      }`}
                    >
                      {stop.stationaryTime ?? "—"}
                    </td>
                    <td className="py-2 text-right font-mono text-xs">
                      {stop.pitLaneTime ?? "—"}
                    </td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
