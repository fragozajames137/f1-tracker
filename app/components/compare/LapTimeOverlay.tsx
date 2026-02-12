"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import type { LapOverlayPoint, DriverMetrics } from "@/app/lib/compare";

const MONO_FONT = "'Space Mono', ui-monospace, monospace";

const TOOLTIP_STYLE = {
  backgroundColor: "#1a1a1a",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  fontSize: 12,
  fontFamily: MONO_FONT,
};

interface LapTimeOverlayProps {
  data: LapOverlayPoint[];
  driverA: DriverMetrics;
  driverB: DriverMetrics;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}:${secs.toFixed(1).padStart(4, "0")}`;
  return secs.toFixed(1);
}

export default function LapTimeOverlay({
  data,
  driverA,
  driverB,
}: LapTimeOverlayProps) {
  const sameTeam = driverA.teamColor === driverB.teamColor;
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          Lap Times
        </h3>
        <p className="text-sm text-white/30">No lap data available</p>
      </div>
    );
  }

  // Compute Y-axis bounds excluding outliers
  const allTimes = data
    .flatMap((d) => [d.driverA, d.driverB])
    .filter((t): t is number => t !== null);

  const [minY, maxY] = (() => {
    if (allTimes.length === 0) return [0, 120];
    const sorted = [...allTimes].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const reasonable = sorted.filter((t) => t <= median * 1.5);
    const min = reasonable[0] ?? sorted[0];
    const max = reasonable[reasonable.length - 1] ?? sorted[sorted.length - 1];
    const padding = Math.max((max - min) * 0.15, 1);
    return [Math.max(0, min - padding), max + padding];
  })();

  // Collect pit stop laps
  const pitLapsA = data
    .filter((d) => d.driverAPit)
    .map((d) => d.lap);
  const pitLapsB = data
    .filter((d) => d.driverBPit)
    .map((d) => d.lap);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
          Lap Times
        </h3>
        <span className="text-[10px] text-white/30">
          {sameTeam && `Dashed = ${driverB.abbreviation}`}
          {sameTeam && (pitLapsA.length > 0 || pitLapsB.length > 0) && " · "}
          {(pitLapsA.length > 0 || pitLapsB.length > 0) && "Vertical = pit stops"}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={250} className="sm:!h-[300px]">
        <LineChart data={data}>
          <XAxis
            dataKey="lap"
            stroke="#666"
            tick={{ fontSize: 10, fill: "#666", fontFamily: MONO_FONT }}
          />
          <YAxis
            stroke="#666"
            tick={{ fontSize: 10, fill: "#666", fontFamily: MONO_FONT }}
            width={50}
            domain={[minY, maxY]}
            tickFormatter={formatTime}
            reversed
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(v) => `Lap ${v}`}
            formatter={(value) => [
              formatTime(value as number),
              "",
            ]}
          />
          <Legend
            wrapperStyle={{
              fontSize: 12,
              color: "#999",
              fontFamily: MONO_FONT,
            }}
          />

          {/* Pit stop reference lines */}
          {pitLapsA.map((lap) => (
            <ReferenceLine
              key={`pitA-${lap}`}
              x={lap}
              stroke={driverA.teamColor}
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
          ))}
          {pitLapsB.map((lap) => (
            <ReferenceLine
              key={`pitB-${lap}`}
              x={lap}
              stroke={driverB.teamColor}
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
          ))}

          <Line
            name={driverA.abbreviation}
            type="monotone"
            dataKey="driverA"
            stroke={driverA.teamColor}
            dot={false}
            strokeWidth={1.5}
            connectNulls
          />
          <Line
            name={driverB.abbreviation}
            type="monotone"
            dataKey="driverB"
            stroke={driverB.teamColor}
            strokeDasharray={sameTeam ? "6 3" : undefined}
            dot={false}
            strokeWidth={1.5}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
