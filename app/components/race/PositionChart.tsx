"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import ShareCard from "../shared/ShareCard";

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

interface RaceControlMessage {
  utc: string | null;
  lapNumber: number | null;
  category: string | null;
  flag: string | null;
  scope: string | null;
  sector: number | null;
  driverNumber: number | null;
  message: string;
}

interface IncidentOverlay {
  type: "SC" | "VSC" | "RED";
  startLap: number;
  endLap: number;
  label: string;
}

interface PositionChartProps {
  sessionKey: number;
}

function parseIncidentOverlays(messages: RaceControlMessage[]): IncidentOverlay[] {
  const overlays: IncidentOverlay[] = [];
  let currentSC: { type: "SC" | "VSC"; startLap: number } | null = null;
  let currentRed: { startLap: number } | null = null;

  for (const msg of messages) {
    const lap = msg.lapNumber ?? 0;
    const text = msg.message.toUpperCase();
    const cat = msg.category;

    if (cat === "SafetyCar" || text.includes("SAFETY CAR DEPLOYED")) {
      if (!currentSC) {
        currentSC = { type: "SC", startLap: lap };
      }
    } else if (cat === "VirtualSafetyCar" || text.includes("VIRTUAL SAFETY CAR DEPLOYED")) {
      if (!currentSC) {
        currentSC = { type: "VSC", startLap: lap };
      }
    } else if (
      (text.includes("SAFETY CAR") && text.includes("IN THIS LAP")) ||
      text.includes("GREEN LIGHT") ||
      (cat === "SafetyCar" && text.includes("ENDING")) ||
      (cat === "VirtualSafetyCar" && text.includes("ENDING"))
    ) {
      if (currentSC) {
        overlays.push({
          type: currentSC.type,
          startLap: currentSC.startLap,
          endLap: lap,
          label: currentSC.type === "SC" ? "Safety Car" : "Virtual SC",
        });
        currentSC = null;
      }
    }

    if (msg.flag === "RED") {
      if (!currentRed) {
        currentRed = { startLap: lap };
      }
    } else if (currentRed && msg.flag === "GREEN") {
      overlays.push({
        type: "RED",
        startLap: currentRed.startLap,
        endLap: lap,
        label: "Red Flag",
      });
      currentRed = null;
    }
  }

  // Close any unclosed overlays at last lap
  if (currentSC) {
    overlays.push({
      type: currentSC.type,
      startLap: currentSC.startLap,
      endLap: currentSC.startLap + 3,
      label: currentSC.type === "SC" ? "Safety Car" : "Virtual SC",
    });
  }
  if (currentRed) {
    overlays.push({
      type: "RED",
      startLap: currentRed.startLap,
      endLap: currentRed.startLap + 2,
      label: "Red Flag",
    });
  }

  return overlays;
}

// Parse key moment annotations from race control
function parseKeyMoments(
  messages: RaceControlMessage[],
  driverMap: Record<number, DriverInfo>,
): Array<{ lap: number; label: string; color: string }> {
  const moments: Array<{ lap: number; label: string; color: string }> = [];
  const seen = new Set<string>();

  for (const msg of messages) {
    if (!msg.lapNumber) continue;
    const text = msg.message.toUpperCase();
    const key = `${msg.lapNumber}-${msg.category}-${msg.driverNumber ?? ""}`;

    if (seen.has(key)) continue;

    if (msg.category === "SafetyCar" && text.includes("DEPLOYED")) {
      seen.add(key);
      moments.push({ lap: msg.lapNumber, label: "SC", color: "#eab308" });
    } else if (msg.category === "VirtualSafetyCar" && text.includes("DEPLOYED")) {
      seen.add(key);
      moments.push({ lap: msg.lapNumber, label: "VSC", color: "#f59e0b" });
    } else if (msg.flag === "RED") {
      seen.add(key);
      moments.push({ lap: msg.lapNumber, label: "RED", color: "#ef4444" });
    } else if (text.includes("RETIRED") || text.includes("STOPPED")) {
      seen.add(key);
      const abbr = msg.driverNumber && driverMap[msg.driverNumber]
        ? driverMap[msg.driverNumber].abbreviation
        : "";
      moments.push({ lap: msg.lapNumber, label: abbr ? `${abbr} OUT` : "RET", color: "#9ca3af" });
    } else if (text.includes("TIME PENALTY") || text.includes("SECOND PENALTY")) {
      seen.add(key);
      const abbr = msg.driverNumber && driverMap[msg.driverNumber]
        ? driverMap[msg.driverNumber].abbreviation
        : "";
      moments.push({ lap: msg.lapNumber, label: abbr ? `${abbr} PEN` : "PEN", color: "#f97316" });
    }
  }

  return moments;
}

const OVERLAY_COLORS: Record<string, { fill: string; opacity: number }> = {
  SC: { fill: "#eab308", opacity: 0.15 },
  VSC: { fill: "#f59e0b", opacity: 0.1 },
  RED: { fill: "#ef4444", opacity: 0.15 },
};

export default function PositionChart({ sessionKey }: PositionChartProps) {
  const [lapData, setLapData] = useState<LapChartData | null>(null);
  const [rcMessages, setRcMessages] = useState<RaceControlMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedDriver, setFocusedDriver] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/sessions/${sessionKey}/lap-chart`, { signal: ac.signal }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
      fetch(`/api/sessions/${sessionKey}/race-control`, { signal: ac.signal })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ])
      .then(([lapChart, rc]) => {
        if (ac.signal.aborted) return;
        setLapData(lapChart);
        setRcMessages(rc);
      })
      .catch((e) => { if (!ac.signal.aborted) setError("Failed to load position data"); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [sessionKey]);

  const overlays = useMemo(() => parseIncidentOverlays(rcMessages), [rcMessages]);
  const keyMoments = useMemo(
    () => parseKeyMoments(rcMessages, lapData?.drivers ?? {}),
    [rcMessages, lapData],
  );

  const handleLegendClick = useCallback(
    (entry: { value?: string }) => {
      const abbr = entry.value;
      if (!abbr) return;
      setFocusedDriver((prev) => (prev === abbr ? null : abbr));
    },
    [],
  );

  if (loading) {
    return <p className="py-8 text-center text-sm text-white/40">Loading position chart...</p>;
  }

  if (error || !lapData) {
    return <p className="py-8 text-center text-sm text-red-400">{error ?? "No data"}</p>;
  }

  if (lapData.laps.length === 0) {
    return <p className="py-8 text-center text-sm text-white/30">No lap position data available</p>;
  }

  const driverEntries = Object.values(lapData.drivers);
  const chartData = lapData.laps.map(({ lap, positions }) => {
    const point: Record<string, number> = { lap };
    for (const pos of positions) {
      const driver = lapData.drivers[pos.driverNumber];
      if (driver) {
        point[driver.abbreviation] = pos.position;
      }
    }
    return point;
  });

  const maxPosition = Math.max(
    ...lapData.laps.flatMap((l) => l.positions.map((p) => p.position)),
    20,
  );

  // Teammate differentiation: solid/dashed for same team color
  const colorIndex = new Map<string, number>();
  const DASH_PATTERNS: (string | undefined)[] = [undefined, "6 3"];
  const driverMeta = driverEntries.map((d) => {
    const idx = colorIndex.get(d.teamColor) ?? 0;
    colorIndex.set(d.teamColor, idx + 1);
    return { ...d, dash: DASH_PATTERNS[idx] };
  });

  return (
    <ShareCard
      title={`Position Chart`}
      subtitle="Lap-by-lap positions"
    >
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Position Chart
          </h3>
          {focusedDriver && (
            <button
              onClick={() => setFocusedDriver(null)}
              className="cursor-pointer text-xs text-white/40 hover:text-white"
            >
              Clear focus
            </button>
          )}
        </div>

        <ResponsiveContainer width="100%" height={400} className="sm:!h-[500px]">
          <LineChart data={chartData}>
            {/* SC/VSC/Red Flag overlays */}
            {overlays.map((overlay, i) => {
              const colors = OVERLAY_COLORS[overlay.type];
              return (
                <ReferenceArea
                  key={`overlay-${i}`}
                  x1={overlay.startLap}
                  x2={overlay.endLap}
                  fill={colors.fill}
                  fillOpacity={colors.opacity}
                  strokeOpacity={0}
                  label={{
                    value: overlay.label,
                    position: "insideTopLeft",
                    fill: colors.fill,
                    fontSize: 9,
                    fontFamily: MONO_FONT,
                  }}
                />
              );
            })}

            {/* Key moment markers */}
            {keyMoments.map((moment, i) => (
              <ReferenceLine
                key={`moment-${i}`}
                x={moment.lap}
                stroke={moment.color}
                strokeDasharray="3 3"
                strokeOpacity={0.5}
                label={{
                  value: moment.label,
                  position: "top",
                  fill: moment.color,
                  fontSize: 8,
                  fontFamily: MONO_FONT,
                }}
              />
            ))}

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
              wrapperStyle={{ fontSize: 10, color: "#999", fontFamily: MONO_FONT, cursor: "pointer" }}
              onClick={handleLegendClick}
            />
            {driverMeta.map((driver) => (
              <Line
                key={driver.abbreviation}
                type="monotone"
                dataKey={driver.abbreviation}
                stroke={`#${driver.teamColor}`}
                strokeDasharray={driver.dash}
                dot={false}
                strokeWidth={
                  focusedDriver
                    ? focusedDriver === driver.abbreviation
                      ? 2.5
                      : 0.5
                    : 1.5
                }
                strokeOpacity={
                  focusedDriver
                    ? focusedDriver === driver.abbreviation
                      ? 1
                      : 0.15
                    : 0.85
                }
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Overlay legend */}
        {overlays.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/40">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-4 rounded-sm bg-yellow-500/30" />
              Safety Car
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-4 rounded-sm bg-amber-500/20" />
              Virtual SC
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-4 rounded-sm bg-red-500/30" />
              Red Flag
            </span>
            <span className="ml-auto text-white/30">Click legend to focus driver</span>
          </div>
        )}
      </div>
    </ShareCard>
  );
}
