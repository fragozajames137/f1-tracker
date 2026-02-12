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
import type { TelemetrySpeedTrace, TelemetryDriver } from "@/app/types/telemetry";

const MONO_FONT = "'Space Mono', ui-monospace, monospace";
const KMH_TO_MPH = 0.621371;

interface SpeedTraceProps {
  traces: TelemetrySpeedTrace[];
  drivers: TelemetryDriver[];
  speedUnit?: "kph" | "mph";
}

export default function SpeedTrace({ traces, drivers, speedUnit = "kph" }: SpeedTraceProps) {
  const isMph = speedUnit === "mph";
  const unitLabel = isMph ? "mph" : "kph";

  if (traces.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          Speed Trace
        </h3>
        <p className="text-sm text-white/30">No speed trace data available</p>
      </div>
    );
  }

  // Build unified dataset keyed by distance
  // Use the first trace's distance array as reference
  const refTrace = traces[0];
  const data = refTrace.distance.map((dist, i) => {
    const point: Record<string, number> = { distance: Math.round(dist) };
    for (const trace of traces) {
      const driver = drivers.find((d) => d.number === trace.driverNumber);
      const key = driver?.abbreviation ?? `#${trace.driverNumber}`;
      const raw = trace.speed[i] ?? 0;
      point[key] = isMph ? Math.round(raw * KMH_TO_MPH) : raw;
    }
    return point;
  });

  const driverKeys = traces.map((t) => {
    const driver = drivers.find((d) => d.number === t.driverNumber);
    return {
      key: driver?.abbreviation ?? `#${t.driverNumber}`,
      color: driver?.teamColor ?? "#666",
    };
  });

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        Speed Trace — Fastest Laps
      </h3>
      <ResponsiveContainer width="100%" height={250} className="sm:!h-[300px]">
        <LineChart data={data}>
          <XAxis
            dataKey="distance"
            stroke="#666"
            tick={{ fontSize: 10, fill: "#666", fontFamily: MONO_FONT }}
            tickFormatter={(v) => `${(v / 1000).toFixed(1)}km`}
          />
          <YAxis
            stroke="#666"
            tick={{ fontSize: 10, fill: "#666", fontFamily: MONO_FONT }}
            width={40}
            domain={[0, "auto"]}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: 12,
              fontFamily: MONO_FONT,
            }}
            labelFormatter={(v) => `${(Number(v) / 1000).toFixed(2)} km`}
            formatter={(value) => [`${value} ${unitLabel}`]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "#999", fontFamily: MONO_FONT }}
          />
          {driverKeys.map(({ key, color }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              dot={false}
              strokeWidth={1.5}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
