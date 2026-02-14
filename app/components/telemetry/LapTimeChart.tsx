"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { TelemetryLap, TelemetryDriver } from "@/app/types/telemetry";

const MONO_FONT = "'Space Mono', ui-monospace, monospace";

interface LapTimeChartProps {
  laps: TelemetryLap[];
  drivers: TelemetryDriver[];
  selectedDriverNumbers: number[];
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toFixed(1).padStart(4, "0")}`;
  }
  return secs.toFixed(1);
}

export default function LapTimeChart({
  laps,
  drivers,
  selectedDriverNumbers,
}: LapTimeChartProps) {
  if (selectedDriverNumbers.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          Lap Times
        </h3>
        <p className="text-sm text-white/30">
          Select drivers above to compare lap times
        </p>
      </div>
    );
  }

  // Filter to selected drivers, exclude pit laps, and require valid times
  const filteredLaps = laps.filter(
    (l) =>
      selectedDriverNumbers.includes(l.driverNumber) &&
      l.lapTime !== null &&
      !l.isPitOutLap &&
      !l.isPitInLap,
  );

  // Get all unique lap numbers
  const lapNumbers = [
    ...new Set(filteredLaps.map((l) => l.lapNumber)),
  ].sort((a, b) => a - b);

  // Build chart data
  const data = lapNumbers.map((lapNum) => {
    const point: Record<string, number> = { lap: lapNum };
    for (const driverNum of selectedDriverNumbers) {
      const lap = filteredLaps.find(
        (l) => l.driverNumber === driverNum && l.lapNumber === lapNum,
      );
      const driver = drivers.find((d) => d.number === driverNum);
      const key = driver?.abbreviation ?? `#${driverNum}`;
      if (lap?.lapTime !== null && lap?.lapTime !== undefined) {
        point[key] = lap.lapTime;
      }
    }
    return point;
  });

  const DASH_PATTERNS: (string | undefined)[] = [undefined, "6 3", "2 4"];
  const driverKeys = (() => {
    const keys = selectedDriverNumbers.map((num) => {
      const driver = drivers.find((d) => d.number === num);
      return {
        key: driver?.abbreviation ?? `#${num}`,
        color: driver?.teamColor ?? "#666",
      };
    });
    // Assign dash patterns so teammates sharing a color are distinguishable
    const colorIndex = new Map<string, number>();
    return keys.map((dk) => {
      const idx = colorIndex.get(dk.color) ?? 0;
      colorIndex.set(dk.color, idx + 1);
      return { ...dk, dash: DASH_PATTERNS[idx] };
    });
  })();
  const hasTeammates = driverKeys.some((dk) => dk.dash !== undefined);

  // Compute tight Y-axis bounds from actual data, excluding outliers
  const allTimes = filteredLaps
    .map((l) => l.lapTime)
    .filter((t): t is number => t !== null);
  const [minY, maxY] = (() => {
    if (allTimes.length === 0) return [0, 120];
    const sorted = [...allTimes].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    // Exclude laps slower than 1.5x the median (safety cars, slow laps)
    const reasonable = sorted.filter((t) => t <= median * 1.5);
    const min = reasonable[0] ?? sorted[0];
    const max = reasonable[reasonable.length - 1] ?? sorted[sorted.length - 1];
    const padding = Math.max((max - min) * 0.15, 1);
    return [Math.max(0, min - padding), max + padding];
  })();

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
          Lap Times
        </h3>
        {hasTeammates && (
          <span className="text-[10px] text-white/30">
            Dashed/dotted = teammates
          </span>
        )}
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
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: 12,
              fontFamily: MONO_FONT,
            }}
            labelFormatter={(v) => `Lap ${v}`}
            formatter={(value) => [formatTime(value as number)]}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#999", fontFamily: MONO_FONT }} />
          {driverKeys.map(({ key, color, dash }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              strokeDasharray={dash}
              dot={false}
              strokeWidth={1.5}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
