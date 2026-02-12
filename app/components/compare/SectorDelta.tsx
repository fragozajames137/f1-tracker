"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import type {
  SectorDelta as SectorDeltaType,
  DriverMetrics,
  SectorTableRow,
} from "@/app/lib/compare";

const MONO_FONT = "'Space Mono', ui-monospace, monospace";

interface SectorDeltaProps {
  sectorDelta: SectorDeltaType;
  driverA: DriverMetrics;
  driverB: DriverMetrics;
  sectorTableData?: SectorTableRow[];
}

function formatTime(v: number | null): string {
  if (v === null) return "—";
  return v.toFixed(3);
}

export default function SectorDelta({
  sectorDelta,
  driverA,
  driverB,
  sectorTableData,
}: SectorDeltaProps) {
  const sectors = [
    { name: "Sector 1", delta: sectorDelta.s1 },
    { name: "Sector 2", delta: sectorDelta.s2 },
    { name: "Sector 3", delta: sectorDelta.s3 },
  ].filter((s) => s.delta !== null) as { name: string; delta: number }[];

  if (sectors.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
          Sector Delta
        </h3>
        <p className="text-sm text-white/30">No sector data available</p>
      </div>
    );
  }

  // Symmetric axis: max absolute delta
  const maxDelta = Math.max(...sectors.map((s) => Math.abs(s.delta)));
  const axisBound = Math.ceil(maxDelta * 1000) / 1000 + 0.05;

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        Sector Delta (Best Laps)
      </h3>
      <div className="mb-2 flex justify-between px-1 text-[10px] font-semibold text-white/40 sm:text-xs">
        <span style={{ color: driverA.teamColor }}>
          ← {driverA.abbreviation} faster
        </span>
        <span style={{ color: driverB.teamColor }}>
          {driverB.abbreviation} faster →
        </span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={sectors} layout="vertical">
          <XAxis
            type="number"
            domain={[-axisBound, axisBound]}
            stroke="#666"
            tick={{ fontSize: 10, fill: "#666", fontFamily: MONO_FONT }}
            tickFormatter={(v) =>
              v === 0 ? "0" : `${v > 0 ? "+" : ""}${v.toFixed(3)}s`
            }
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#666"
            tick={{ fontSize: 10, fill: "#666", fontFamily: MONO_FONT }}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: 12,
              fontFamily: MONO_FONT,
            }}
            formatter={(value) => {
              const v = value as number;
              const abs = Math.abs(v).toFixed(3);
              if (v > 0) return [`${driverA.abbreviation} faster by ${abs}s`];
              if (v < 0) return [`${driverB.abbreviation} faster by ${abs}s`];
              return ["Tied"];
            }}
            labelFormatter={(label) => label}
          />
          <ReferenceLine x={0} stroke="#666" strokeWidth={1} />
          <Bar dataKey="delta" radius={[4, 4, 4, 4]}>
            {sectors.map((s, i) => (
              <Cell
                key={i}
                fill={
                  s.delta > 0
                    ? driverA.teamColor
                    : s.delta < 0
                      ? driverB.teamColor
                      : "#666"
                }
                fillOpacity={0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Sector comparison table */}
      {sectorTableData && sectorTableData.length > 0 && (
        <div className="mt-4 overflow-x-auto border-t border-white/5 pt-4">
          <table className="w-full text-xs" style={{ fontFamily: MONO_FONT }}>
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-white/30">
                <th className="pb-2 text-left font-semibold">Sector</th>
                <th className="pb-2 text-right font-semibold" style={{ color: driverA.teamColor }}>
                  {driverA.abbreviation} Best
                </th>
                <th className="pb-2 text-right font-semibold" style={{ color: driverB.teamColor }}>
                  {driverB.abbreviation} Best
                </th>
                <th className="pb-2 text-right font-semibold">Delta</th>
                <th className="pb-2 text-right font-semibold" style={{ color: driverA.teamColor }}>
                  {driverA.abbreviation} Avg
                </th>
                <th className="pb-2 text-right font-semibold" style={{ color: driverB.teamColor }}>
                  {driverB.abbreviation} Avg
                </th>
              </tr>
            </thead>
            <tbody>
              {sectorTableData.map((row) => {
                const deltaColor =
                  row.delta !== null && row.delta > 0
                    ? driverA.teamColor
                    : row.delta !== null && row.delta < 0
                      ? driverB.teamColor
                      : "#666";
                return (
                  <tr key={row.sector} className="border-t border-white/5">
                    <td className="py-1.5 text-white/50">{row.sector}</td>
                    <td className="py-1.5 text-right text-white/70">
                      {formatTime(row.bestA)}
                    </td>
                    <td className="py-1.5 text-right text-white/70">
                      {formatTime(row.bestB)}
                    </td>
                    <td className="py-1.5 text-right font-semibold" style={{ color: deltaColor }}>
                      {row.delta !== null
                        ? `${row.delta > 0 ? "+" : ""}${row.delta.toFixed(3)}s`
                        : "—"}
                    </td>
                    <td className="py-1.5 text-right text-white/50">
                      {formatTime(row.avgTimeA)}
                    </td>
                    <td className="py-1.5 text-right text-white/50">
                      {formatTime(row.avgTimeB)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
