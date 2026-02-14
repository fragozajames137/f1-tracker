"use client";

import { useState, useEffect } from "react";
import {
  ComposedChart,
  Line,
  Bar,
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
  pressure: number | null;
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
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/sessions/${sessionKey}/weather`, { signal: ac.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((e) => { if (!ac.signal.aborted) setError("Failed to load weather data"); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
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
    humidity: entry.humidity,
    windSpeed: entry.windSpeed,
    rainfall: entry.rainfall ? 1 : 0,
  }));

  const hasHumidity = chartData.some((d) => d.humidity !== null);
  const hasWind = chartData.some((d) => d.windSpeed !== null);

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
        <ComposedChart data={chartData}>
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
            yAxisId="temp"
            stroke="#666"
            tick={{ fontSize: 10, fill: "#666", fontFamily: MONO_FONT }}
            width={35}
            domain={[minTemp, maxTemp]}
            tickFormatter={(v: number) => `${v}°`}
          />
          {(hasHumidity || hasWind) && (
            <YAxis
              yAxisId="pct"
              orientation="right"
              stroke="#666"
              tick={{ fontSize: 10, fill: "#555", fontFamily: MONO_FONT }}
              width={35}
              domain={[0, hasHumidity ? 100 : "auto"]}
              tickFormatter={(v: number) => hasHumidity ? `${v}%` : `${v}`}
            />
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: 12,
              fontFamily: MONO_FONT,
            }}
            labelFormatter={(i) => chartData[Number(i)]?.time ?? ""}
            formatter={(value, name) => {
              const v = Number(value);
              switch (name) {
                case "airTemp": return [`${v.toFixed(1)}°C`, "Air"];
                case "trackTemp": return [`${v.toFixed(1)}°C`, "Track"];
                case "humidity": return [`${v.toFixed(0)}%`, "Humidity"];
                case "windSpeed": return [`${v.toFixed(1)} km/h`, "Wind"];
                default: return [`${v}`, name];
              }
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 10, color: "#999", fontFamily: MONO_FONT }}
            formatter={(value: string) => {
              switch (value) {
                case "airTemp": return "Air Temp";
                case "trackTemp": return "Track Temp";
                case "humidity": return "Humidity";
                case "windSpeed": return "Wind Speed";
                default: return value;
              }
            }}
          />
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="airTemp"
            stroke="#60a5fa"
            dot={false}
            strokeWidth={1.5}
            connectNulls
          />
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="trackTemp"
            stroke="#fb923c"
            dot={false}
            strokeWidth={1.5}
            connectNulls
          />
          {hasHumidity && (
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="humidity"
              stroke="#34d399"
              dot={false}
              strokeWidth={1}
              strokeDasharray="4 2"
              connectNulls
            />
          )}
          {hasWind && (
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="windSpeed"
              stroke="#a78bfa"
              dot={false}
              strokeWidth={1}
              strokeDasharray="4 2"
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      {rainfallRegions.length > 0 && (
        <p className="mt-2 text-xs text-blue-400/60">
          Shaded regions indicate rainfall
        </p>
      )}
    </div>
  );
}
