"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { GapDeltaPoint, DriverMetrics } from "@/app/lib/compare";

const MONO_FONT = "'Space Mono', ui-monospace, monospace";

interface GapDeltaProps {
  data: GapDeltaPoint[];
  driverA: DriverMetrics;
  driverB: DriverMetrics;
}

export default function GapDelta({ data, driverA, driverB }: GapDeltaProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          Cumulative Gap Delta
        </h3>
        <p className="text-sm text-white/30">No telemetry data available</p>
      </div>
    );
  }

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.delta)));
  const axisBound = Math.ceil(maxAbs * 10) / 10 + 0.1;

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">
        Cumulative Gap Delta
      </h3>
      <div className="mb-3 flex justify-between px-1 text-[10px] text-white/30">
        <span>
          Above 0 ={" "}
          <span style={{ color: driverA.teamColor }}>
            {driverA.abbreviation}
          </span>{" "}
          ahead
        </span>
        <span>
          Below 0 ={" "}
          <span style={{ color: driverB.teamColor }}>
            {driverB.abbreviation}
          </span>{" "}
          ahead
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data}>
          <defs>
            <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={driverA.teamColor} stopOpacity={0.4} />
              <stop offset="100%" stopColor={driverA.teamColor} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="gradB" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor={driverB.teamColor} stopOpacity={0.4} />
              <stop offset="100%" stopColor={driverB.teamColor} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="progress"
            type="number"
            domain={[0, 100]}
            stroke="#444"
            tick={{ fontSize: 10, fill: "#666", fontFamily: MONO_FONT }}
            tickFormatter={(v) => `${Math.round(v)}%`}
          />
          <YAxis
            domain={[-axisBound, axisBound]}
            stroke="#444"
            tick={{ fontSize: 10, fill: "#666", fontFamily: MONO_FONT }}
            tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}s`}
            width={50}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: 12,
              fontFamily: MONO_FONT,
            }}
            formatter={(value: number | undefined) => {
              if (value === undefined) return ["—"];
              const abs = Math.abs(value).toFixed(3);
              if (value > 0) return [`${driverA.abbreviation} ahead by ${abs}s`];
              if (value < 0) return [`${driverB.abbreviation} ahead by ${abs}s`];
              return ["Even"];
            }}
            labelFormatter={(v) => `${Math.round(v as number)}% of lap`}
          />
          {/* Sector boundary markers */}
          <ReferenceLine
            x={33.33}
            stroke="#555"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{ value: "S1/S2", position: "top", fontSize: 9, fill: "#555" }}
          />
          <ReferenceLine
            x={66.67}
            stroke="#555"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{ value: "S2/S3", position: "top", fontSize: 9, fill: "#555" }}
          />
          <ReferenceLine y={0} stroke="#666" strokeWidth={1} />
          {/* Dual-color area fills */}
          <Area
            dataKey="deltaPositive"
            type="monotone"
            fill="url(#gradA)"
            stroke="none"
            baseLine={0}
            isAnimationActive={false}
          />
          <Area
            dataKey="deltaNegative"
            type="monotone"
            fill="url(#gradB)"
            stroke="none"
            baseLine={0}
            isAnimationActive={false}
          />
          {/* White delta line */}
          <Line
            dataKey="delta"
            type="monotone"
            stroke="#fff"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
