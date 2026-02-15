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
} from "recharts";
import { formatLapTime } from "@/app/lib/format";
import { usePreferencesStore } from "@/app/stores/preferences";

const MONO_FONT = "'Space Mono', ui-monospace, monospace";

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

interface DriverResult {
  abbreviation: string;
  teamColor: string | null;
  gridPosition: number | null;
  finalPosition: number | null;
  bestLapTime: string | null;
  bestLapTimeSeconds: number | null;
  fullName: string | null;
}

interface QualifyingGapChartProps {
  sessionKey: number;
}

export default function QualifyingGapChart({ sessionKey }: QualifyingGapChartProps) {
  const [drivers, setDrivers] = useState<DriverResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const favoriteDriverIds = usePreferencesStore((s) => s.favoriteDriverIds);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/sessions/${sessionKey}`, { signal: ac.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (ac.signal.aborted) return;
        if (data?.drivers) {
          setDrivers(
            [...data.drivers].sort(
              (a: DriverResult, b: DriverResult) =>
                (a.finalPosition ?? 99) - (b.finalPosition ?? 99),
            ),
          );
        }
      })
      .catch((e) => {
        if (!ac.signal.aborted) setError("Failed to load qualifying data");
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [sessionKey]);

  const { chartData, maxGap } = useMemo(() => {
    if (!drivers || drivers.length === 0) return { chartData: [], maxGap: 0 };

    // Find pole time
    const poleDriver = drivers[0];
    const poleTime = poleDriver?.bestLapTimeSeconds ?? null;

    if (poleTime === null) return { chartData: [], maxGap: 0 };

    let maxG = 0;
    const data = drivers.map((d, i) => {
      const gap =
        d.bestLapTimeSeconds !== null ? d.bestLapTimeSeconds - poleTime : null;
      if (gap !== null && gap > maxG) maxG = gap;

      // Determine qualifying session (Q1/Q2/Q3)
      const pos = d.finalPosition ?? i + 1;
      let qSession: "Q3" | "Q2" | "Q1" = "Q3";
      if (pos > 15) qSession = "Q1";
      else if (pos > 10) qSession = "Q2";

      return {
        position: pos,
        abbreviation: d.abbreviation,
        label: `${pos}. ${d.abbreviation}`,
        gap: gap ?? 0,
        gapDisplay: gap === null ? "No time" : gap === 0 ? "POLE" : `+${gap.toFixed(3)}s`,
        teamColor: d.teamColor ? `#${d.teamColor}` : "#666",
        fullName: d.fullName ?? d.abbreviation,
        lapTime: d.bestLapTimeSeconds,
        lapTimeFormatted: formatLapTime(d.bestLapTimeSeconds ?? null),
        qSession,
        isPole: gap === 0,
        isFavorite: d.fullName
          ? favoriteDriverIds.includes(nameToSlug(d.fullName))
          : false,
      };
    });

    return { chartData: data, maxGap: maxG };
  }, [drivers, favoriteDriverIds]);

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-white/40">
        Loading qualifying data...
      </p>
    );
  }

  if (error || !drivers) {
    return (
      <p className="py-8 text-center text-sm text-red-400">
        {error ?? "No data"}
      </p>
    );
  }

  if (chartData.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-white/30">
        No qualifying data available
      </p>
    );
  }

  const chartHeight = Math.max(400, chartData.length * 28);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        Qualifying — Gap to Pole
      </h3>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 60, bottom: 4, left: 8 }}
          barCategoryGap="20%"
        >
          <XAxis
            type="number"
            stroke="#666"
            tick={{ fontSize: 10, fill: "#666", fontFamily: MONO_FONT }}
            domain={[0, Math.ceil(maxGap * 10) / 10 + 0.1]}
            tickFormatter={(v: number) => (v === 0 ? "0" : `+${v.toFixed(1)}s`)}
          />
          <YAxis
            type="category"
            dataKey="label"
            stroke="transparent"
            tick={(props) => {
              const { x, y, payload } = props as { x: number; y: number; payload: { value: string } };
              const entry = chartData.find((d) => d.label === payload.value);
              const sessionColor =
                entry?.qSession === "Q1"
                  ? "#ef4444"
                  : entry?.qSession === "Q2"
                    ? "#f59e0b"
                    : "transparent";
              return (
                <g transform={`translate(${x},${y})`}>
                  <circle cx={-62} cy={0} r={3} fill={sessionColor} opacity={0.6} />
                  <text
                    x={-4}
                    y={0}
                    dy={4}
                    textAnchor="end"
                    fill="#999"
                    fontSize={11}
                    fontFamily={MONO_FONT}
                  >
                    {payload.value}
                  </text>
                </g>
              );
            }}
            width={72}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: 12,
              fontFamily: MONO_FONT,
            }}
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
                      {d.fullName}
                    </span>
                  </div>
                  <div className="mt-1 space-y-0.5 text-xs text-white/60">
                    <p>
                      Lap time:{" "}
                      <span className="text-white">{d.lapTimeFormatted}</span>
                    </p>
                    <p>
                      Gap:{" "}
                      <span className="text-white">{d.gapDisplay}</span>
                    </p>
                    <p>
                      Session:{" "}
                      <span className="text-white">{d.qSession}</span>
                    </p>
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="gap" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {chartData.map((entry, i) => (
              <Cell
                key={entry.abbreviation}
                fill={entry.teamColor}
                fillOpacity={
                  entry.qSession === "Q1"
                    ? 0.5
                    : entry.qSession === "Q2"
                      ? 0.7
                      : 0.9
                }
                stroke={entry.isFavorite ? entry.teamColor : "transparent"}
                strokeWidth={entry.isFavorite ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-white/40">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm bg-white/10" />
          Q3 (P1–10)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm bg-amber-500/10" />
          Q2 (P11–15)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm bg-red-500/10" />
          Q1 (P16–20)
        </span>
        {chartData.some((d) => d.isPole) && (
          <span className="ml-auto text-white/30">
            Pole: {chartData.find((d) => d.isPole)?.lapTimeFormatted}
          </span>
        )}
      </div>
    </div>
  );
}
