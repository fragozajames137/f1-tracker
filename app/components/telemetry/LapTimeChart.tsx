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

  const driverKeys = selectedDriverNumbers.map((num) => {
    const driver = drivers.find((d) => d.number === num);
    return {
      key: driver?.abbreviation ?? `#${num}`,
      color: driver?.teamColor ?? "#666",
    };
  });

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        Lap Times
      </h3>
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
            width={45}
            domain={["auto", "auto"]}
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
          {driverKeys.map(({ key, color }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
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
