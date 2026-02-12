"use client";

import type { TelemetrySpeedTrace, TelemetryDriver } from "@/app/types/telemetry";

interface TrackMapProps {
  traces: TelemetrySpeedTrace[];
  drivers: TelemetryDriver[];
}

const PADDING = 20;
const VIEW_SIZE = 500;

/** Map speed (0-370 kph) to HSL hue: red (0) → yellow (60) → green (120) */
function speedToColor(speed: number, minSpeed: number, maxSpeed: number): string {
  const t = maxSpeed > minSpeed ? (speed - minSpeed) / (maxSpeed - minSpeed) : 0;
  const hue = t * 120; // 0=red, 60=yellow, 120=green
  return `hsl(${hue}, 85%, 50%)`;
}

function transformPoints(
  xs: number[],
  ys: number[],
): { sx: number[]; sy: number[]; minSpeed?: undefined; maxSpeed?: undefined } {
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = (VIEW_SIZE - PADDING * 2) / Math.max(rangeX, rangeY);

  const usable = VIEW_SIZE - PADDING * 2;
  const offsetX = PADDING + (usable - rangeX * scale) / 2;
  const offsetY = PADDING + (usable - rangeY * scale) / 2;

  const sx = xs.map((x) => offsetX + (x - minX) * scale);
  // Invert Y: FastF1 is Y-up, SVG is Y-down
  const sy = ys.map((y) => offsetY + (maxY - y) * scale);

  return { sx, sy };
}

export default function TrackMap({ traces, drivers }: TrackMapProps) {
  // Filter to traces that have X/Y data
  const validTraces = traces.filter(
    (t) => t.x && t.y && t.x.length > 1 && t.y.length > 1,
  );

  if (validTraces.length === 0) {
    return null;
  }

  const isSingleDriver = validTraces.length === 1;

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        Track Map — {isSingleDriver ? "Speed Heatmap" : "Fastest Lap Traces"}
      </h3>

      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
          className="h-auto w-full max-w-md"
          style={{ aspectRatio: "1" }}
        >
          {isSingleDriver ? (
            <SingleDriverMap trace={validTraces[0]} />
          ) : (
            <MultiDriverMap traces={validTraces} drivers={drivers} />
          )}
        </svg>
      </div>

      {isSingleDriver && <SpeedLegend />}

      {!isSingleDriver && (
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          {validTraces.map((trace) => {
            const driver = drivers.find((d) => d.number === trace.driverNumber);
            return (
              <span key={trace.driverNumber} className="flex items-center gap-1.5 text-xs text-white/60">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: driver?.teamColor ?? "#666" }}
                />
                {driver?.abbreviation ?? `#${trace.driverNumber}`}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SingleDriverMap({ trace }: { trace: TelemetrySpeedTrace }) {
  const xs = trace.x!;
  const ys = trace.y!;
  const { sx, sy } = transformPoints(xs, ys);

  const minSpeed = Math.min(...trace.speed);
  const maxSpeed = Math.max(...trace.speed);

  // Draw track outline first (thick gray), then colored segments on top
  const outlinePath = sx.map((x, i) => `${i === 0 ? "M" : "L"}${x},${sy[i]}`).join(" ");

  return (
    <>
      {/* Track outline */}
      <path d={outlinePath} fill="none" stroke="#333" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />

      {/* Speed-colored segments */}
      {sx.map((x, i) => {
        if (i === 0) return null;
        return (
          <line
            key={i}
            x1={sx[i - 1]}
            y1={sy[i - 1]}
            x2={x}
            y2={sy[i]}
            stroke={speedToColor(trace.speed[i], minSpeed, maxSpeed)}
            strokeWidth={4}
            strokeLinecap="round"
          />
        );
      })}
    </>
  );
}

function MultiDriverMap({
  traces,
  drivers,
}: {
  traces: TelemetrySpeedTrace[];
  drivers: TelemetryDriver[];
}) {
  // Use first trace for the gray outline
  const refTrace = traces[0];
  const refXs = refTrace.x!;
  const refYs = refTrace.y!;
  const { sx: refSx, sy: refSy } = transformPoints(refXs, refYs);

  const outlinePath = refSx
    .map((x, i) => `${i === 0 ? "M" : "L"}${x},${refSy[i]}`)
    .join(" ");

  return (
    <>
      {/* Track outline from first driver */}
      <path d={outlinePath} fill="none" stroke="#222" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />

      {/* Each driver's trace */}
      {traces.map((trace) => {
        const driver = drivers.find((d) => d.number === trace.driverNumber);
        const color = driver?.teamColor ?? "#666";
        const { sx, sy } = transformPoints(trace.x!, trace.y!);
        const path = sx.map((x, i) => `${i === 0 ? "M" : "L"}${x},${sy[i]}`).join(" ");

        // Label position: end of trace
        const labelX = sx[sx.length - 1];
        const labelY = sy[sy.length - 1];

        return (
          <g key={trace.driverNumber}>
            <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
            <text
              x={labelX + 8}
              y={labelY + 4}
              fill={color}
              fontSize={12}
              fontWeight="bold"
              fontFamily="'Space Mono', monospace"
            >
              {driver?.abbreviation ?? `#${trace.driverNumber}`}
            </text>
          </g>
        );
      })}
    </>
  );
}

function SpeedLegend() {
  return (
    <div className="mt-3 flex items-center justify-center gap-2">
      <span className="text-[10px] text-white/40">Slow</span>
      <div
        className="h-2.5 w-32 rounded-full"
        style={{
          background: "linear-gradient(to right, hsl(0,85%,50%), hsl(60,85%,50%), hsl(120,85%,50%))",
        }}
      />
      <span className="text-[10px] text-white/40">Fast</span>
    </div>
  );
}
