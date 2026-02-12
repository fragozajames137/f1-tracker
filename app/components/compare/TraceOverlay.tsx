"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TraceOverlayPoint, DriverMetrics } from "@/app/lib/compare";

const MONO_FONT = "'Space Mono', ui-monospace, monospace";

type Metric = "speed" | "throttle" | "brake" | "drs";

interface MetricConfig {
  label: string;
  keyA: keyof TraceOverlayPoint;
  keyB: keyof TraceOverlayPoint;
  unit: string;
  domain: [number | "auto", number | "auto"];
  curveType: "monotone" | "stepAfter";
  tickFormatter?: (v: number) => string;
}

const METRICS: Record<Metric, MetricConfig> = {
  speed: {
    label: "Speed",
    keyA: "speedA",
    keyB: "speedB",
    unit: "kph",
    domain: ["auto", "auto"],
    curveType: "monotone",
  },
  throttle: {
    label: "Throttle",
    keyA: "throttleA",
    keyB: "throttleB",
    unit: "%",
    domain: [0, 100],
    curveType: "monotone",
  },
  brake: {
    label: "Brake",
    keyA: "brakeA",
    keyB: "brakeB",
    unit: "",
    domain: [0, 1],
    curveType: "stepAfter",
    tickFormatter: (v: number) => (v === 1 ? "On" : v === 0 ? "Off" : ""),
  },
  drs: {
    label: "DRS",
    keyA: "drsA",
    keyB: "drsB",
    unit: "",
    domain: [0, 1],
    curveType: "stepAfter",
    tickFormatter: (v: number) => (v === 1 ? "On" : v === 0 ? "Off" : ""),
  },
};

interface TraceOverlayProps {
  data: TraceOverlayPoint[];
  driverA: DriverMetrics;
  driverB: DriverMetrics;
}

export default function TraceOverlay({
  data,
  driverA,
  driverB,
}: TraceOverlayProps) {
  const [metric, setMetric] = useState<Metric>("speed");
  const hasDrs = data.length > 0 && data[0].drsA !== null;
  const sameTeam = driverA.teamColor === driverB.teamColor;

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          Telemetry Overlay
        </h3>
        <p className="text-sm text-white/30">No telemetry data available</p>
      </div>
    );
  }

  const cfg = METRICS[metric];
  const allMetrics: Metric[] = ["speed", "throttle", "brake", "drs"];

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
          Telemetry Overlay
        </h3>
        {/* Pill selector */}
        <div className="flex overflow-hidden rounded-lg border border-white/10">
          {allMetrics.map((m) => {
            const disabled = m === "drs" && !hasDrs;
            return (
              <button
                key={m}
                onClick={() => !disabled && setMetric(m)}
                disabled={disabled}
                className={`cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors ${
                  metric === m
                    ? "bg-white/10 text-white"
                    : disabled
                      ? "cursor-not-allowed text-white/15"
                      : "text-white/40 hover:text-white/70"
                }`}
              >
                {METRICS[m].label}
              </button>
            );
          })}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <XAxis
            dataKey="progress"
            type="number"
            domain={[0, 100]}
            stroke="#444"
            tick={{ fontSize: 10, fill: "#666", fontFamily: MONO_FONT }}
            tickFormatter={(v) => `${Math.round(v)}%`}
          />
          <YAxis
            domain={cfg.domain}
            stroke="#444"
            tick={{ fontSize: 10, fill: "#666", fontFamily: MONO_FONT }}
            tickFormatter={
              cfg.tickFormatter ??
              ((v) => `${Math.round(v)}${cfg.unit ? ` ${cfg.unit}` : ""}`)
            }
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
            labelFormatter={(v) => `${Math.round(v as number)}% of lap`}
            formatter={(value: number | undefined, name: string | undefined) => {
              if (value === undefined) return ["—"];
              const driver = name?.endsWith("A")
                ? driverA.abbreviation
                : driverB.abbreviation;
              if (metric === "brake" || metric === "drs") {
                return [value === 1 ? "On" : "Off", driver];
              }
              return [
                `${Math.round(value)}${cfg.unit ? ` ${cfg.unit}` : ""}`,
                driver,
              ];
            }}
          />
          <Line
            dataKey={cfg.keyA as string}
            type={cfg.curveType}
            stroke={driverA.teamColor}
            strokeWidth={1.5}
            dot={false}
            name={`${driverA.abbreviation}A`}
            isAnimationActive={false}
          />
          <Line
            dataKey={cfg.keyB as string}
            type={cfg.curveType}
            stroke={driverB.teamColor}
            strokeDasharray={sameTeam ? "6 3" : undefined}
            strokeWidth={1.5}
            dot={false}
            name={`${driverB.abbreviation}B`}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
