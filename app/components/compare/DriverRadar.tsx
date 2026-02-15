"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import type { RadarPoint, DriverMetrics } from "@/app/lib/compare";

const MONO_FONT = "'Space Mono', ui-monospace, monospace";

interface DriverRadarProps {
  data: RadarPoint[];
  driverA: DriverMetrics;
  driverB: DriverMetrics;
}

export default function DriverRadar({
  data,
  driverA,
  driverB,
}: DriverRadarProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        Driver Profile
      </h3>
      <ResponsiveContainer width="100%" height={250} className="sm:!h-[300px]">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#333" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fontSize: 11, fill: "#999", fontFamily: MONO_FONT }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: 12,
              fontFamily: MONO_FONT,
            }}
            formatter={(value) => [
              `${Math.round(value as number)}/100`,
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
          <Radar
            name={driverA.abbreviation}
            dataKey="driverA"
            stroke={driverA.teamColor}
            fill={driverA.teamColor}
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Radar
            name={driverB.abbreviation}
            dataKey="driverB"
            stroke={driverB.teamColor}
            fill={driverB.teamColor}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
