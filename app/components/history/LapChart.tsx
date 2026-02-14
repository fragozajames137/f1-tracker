"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const MONO_FONT = "'Space Mono', ui-monospace, monospace";

interface DriverInfo {
  driverNumber: number;
  abbreviation: string;
  teamName: string;
  teamColor: string;
}

interface LapPosition {
  driverNumber: number;
  position: number;
}

interface LapChartData {
  drivers: Record<number, DriverInfo>;
  laps: Array<{ lap: number; positions: LapPosition[] }>;
}

interface LapChartProps {
  sessionKey: number;
}

export default function LapChart({ sessionKey }: LapChartProps) {
  const [data, setData] = useState<LapChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/sessions/${sessionKey}/lap-chart`, { signal: ac.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((e) => { if (!ac.signal.aborted) setError("Failed to load lap chart data"); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [sessionKey]);

  if (loading) {
    return <p className="py-8 text-center text-sm text-white/40">Loading lap chart...</p>;
  }

  if (error || !data) {
    return <p className="py-8 text-center text-sm text-red-400">{error ?? "No data"}</p>;
  }

  if (data.laps.length === 0) {
    return <p className="py-8 text-center text-sm text-white/30">No lap position data available</p>;
  }

  const driverEntries = Object.values(data.drivers);

  // Build chart data: each point has { lap, VER: 1, HAM: 3, ... }
  const chartData = data.laps.map(({ lap, positions }) => {
    const point: Record<string, number> = { lap };
    for (const pos of positions) {
      const driver = data.drivers[pos.driverNumber];
      if (driver) {
        point[driver.abbreviation] = pos.position;
      }
    }
    return point;
  });

  const maxPosition = Math.max(
    ...data.laps.flatMap((l) => l.positions.map((p) => p.position)),
    20,
  );

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        Position Chart
      </h3>
      <ResponsiveContainer width="100%" height={350} className="sm:!h-[420px]">
        <LineChart data={chartData}>
          <XAxis
            dataKey="lap"
            stroke="#666"
            tick={{ fontSize: 10, fill: "#666", fontFamily: MONO_FONT }}
            label={{ value: "Lap", position: "insideBottom", offset: -2, fontSize: 10, fill: "#666" }}
          />
          <YAxis
            stroke="#666"
            tick={{ fontSize: 10, fill: "#666", fontFamily: MONO_FONT }}
            width={30}
            domain={[1, maxPosition]}
            reversed
            allowDecimals={false}
            label={{ value: "Position", angle: -90, position: "insideLeft", fontSize: 10, fill: "#666" }}
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
            formatter={(value) => [`P${value}`]}
          />
          <Legend
            wrapperStyle={{ fontSize: 10, color: "#999", fontFamily: MONO_FONT }}
          />
          {driverEntries.map((driver) => (
            <Line
              key={driver.abbreviation}
              type="monotone"
              dataKey={driver.abbreviation}
              stroke={`#${driver.teamColor}`}
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
