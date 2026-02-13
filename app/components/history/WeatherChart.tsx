"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Legend,
} from "recharts";

const MONO_FONT = "'Space Mono', ui-monospace, monospace";

interface WeatherEntry {
  utc: string | null;
  airTemp: number | null;
  trackTemp: number | null;
  humidity: number | null;
  rainfall: boolean | number | null;
  windSpeed: number | null;
  windDirection: number | null;
}

interface WeatherChartProps {
  sessionKey: number;
}

function formatTime(utc: string): string {
  const d = new Date(utc);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WeatherChart({ sessionKey }: WeatherChartProps) {
  const [data, setData] = useState<WeatherEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/sessions/${sessionKey}/weather`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch(() => setError("Failed to load weather data"))
      .finally(() => setLoading(false));
  }, [sessionKey]);

  if (loading) {
    return <p className="py-8 text-center text-sm text-white/40">Loading weather...</p>;
  }

  if (error || !data) {
    return <p className="py-8 text-center text-sm text-red-400">{error ?? "No data"}</p>;
  }

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-white/30">No weather data available</p>;
  }

  const chartData = data.map((entry, i) => ({
    index: i,
    time: entry.utc ? formatTime(entry.utc) : `${i}`,
    airTemp: entry.airTemp,
    trackTemp: entry.trackTemp,
    rainfall: entry.rainfall ? 1 : 0,
  }));

  // Find rainfall regions (contiguous spans)
  const rainfallRegions: Array<{ start: number; end: number }> = [];
  let regionStart: number | null = null;
  for (let i = 0; i < chartData.length; i++) {
    if (chartData[i].rainfall) {
      if (regionStart === null) regionStart = i;
    } else if (regionStart !== null) {
      rainfallRegions.push({ start: regionStart, end: i - 1 });
      regionStart = null;
    }
  }
  if (regionStart !== null) {
    rainfallRegions.push({ start: regionStart, end: chartData.length - 1 });
  }

  // Compute Y range
  const temps = chartData.flatMap((d) =>
    [d.airTemp, d.trackTemp].filter((t): t is number => t !== null),
  );
  const minTemp = Math.floor(Math.min(...temps) - 2);
  const maxTemp = Math.ceil(Math.max(...temps) + 2);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        Weather
      </h3>
      <ResponsiveContainer width="100%" height={250} className="sm:!h-[300px]">
        <LineChart data={chartData}>
          {rainfallRegions.map((region, i) => (
            <ReferenceArea
              key={i}
              x1={region.start}
              x2={region.end}
              fill="#3b82f6"
              fillOpacity={0.1}
              strokeOpacity={0}
            />
          ))}
          <XAxis
            dataKey="index"
            stroke="#666"
            tick={{ fontSize: 10, fill: "#666", fontFamily: MONO_FONT }}
            tickFormatter={(i: number) => chartData[i]?.time ?? ""}
            interval={Math.max(Math.floor(chartData.length / 8), 1)}
          />
          <YAxis
            stroke="#666"
            tick={{ fontSize: 10, fill: "#666", fontFamily: MONO_FONT }}
            width={35}
            domain={[minTemp, maxTemp]}
            tickFormatter={(v: number) => `${v}°`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: 12,
              fontFamily: MONO_FONT,
            }}
            labelFormatter={(i) => chartData[Number(i)]?.time ?? ""}
            formatter={(value, name) => [
              `${Number(value)?.toFixed(1)}°C`,
              name === "airTemp" ? "Air" : "Track",
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 10, color: "#999", fontFamily: MONO_FONT }}
            formatter={(value: string) => (value === "airTemp" ? "Air Temp" : "Track Temp")}
          />
          <Line
            type="monotone"
            dataKey="airTemp"
            stroke="#60a5fa"
            dot={false}
            strokeWidth={1.5}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="trackTemp"
            stroke="#fb923c"
            dot={false}
            strokeWidth={1.5}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      {rainfallRegions.length > 0 && (
        <p className="mt-2 text-xs text-blue-400/60">
          Shaded regions indicate rainfall
        </p>
      )}
    </div>
  );
}
