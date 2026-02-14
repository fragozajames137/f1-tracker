"use client";

import type {
  TelemetrySpeedTrace,
  TelemetryDriver,
  TrackBoundary,
  DrsZone,
} from "@/app/types/telemetry";

interface TrackMapProps {
  traces: TelemetrySpeedTrace[];
  drivers: TelemetryDriver[];
  trackBoundary?: TrackBoundary | null;
  drsZones?: DrsZone[];
  speedUnit?: "kph" | "mph";
}

const PADDING = 20;
const VIEW_SIZE = 500;

/** Map speed (0-370 kph) to HSL hue: red (0) → yellow (60) → green (120) */
function speedToColor(speed: number, minSpeed: number, maxSpeed: number): string {
  const t = maxSpeed > minSpeed ? (speed - minSpeed) / (maxSpeed - minSpeed) : 0;
  const hue = t * 120;
  return `hsl(${hue}, 85%, 50%)`;
}

interface Transform {
  apply: (x: number, y: number) => [number, number];
  applyArrays: (xs: number[], ys: number[]) => { sx: number[]; sy: number[] };
}

/** Compute a single unified transform from all coordinate arrays so everything aligns. */
function computeTransform(xArrays: number[][], yArrays: number[][]): Transform {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  for (const xs of xArrays) {
    for (const x of xs) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
  }
  for (const ys of yArrays) {
    for (const y of ys) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = (VIEW_SIZE - PADDING * 2) / Math.max(rangeX, rangeY);
  const usable = VIEW_SIZE - PADDING * 2;
  const offsetX = PADDING + (usable - rangeX * scale) / 2;
  const offsetY = PADDING + (usable - rangeY * scale) / 2;

  const apply = (x: number, y: number): [number, number] => [
    offsetX + (x - minX) * scale,
    offsetY + (maxY - y) * scale,
  ];

  const applyArrays = (xs: number[], ys: number[]) => ({
    sx: xs.map((x) => offsetX + (x - minX) * scale),
    sy: ys.map((y) => offsetY + (maxY - y) * scale),
  });

  return { apply, applyArrays };
}

export default function TrackMap({ traces, drivers, trackBoundary, drsZones, speedUnit = "kph" }: TrackMapProps) {
  const validTraces = traces.filter(
    (t) => t.x && t.y && t.x.length > 1 && t.y.length > 1,
  );

  if (validTraces.length === 0) {
    return null;
  }

  // Collect all coordinate arrays for unified transform
  const allX: number[][] = validTraces.map((t) => t.x!);
  const allY: number[][] = validTraces.map((t) => t.y!);

  if (trackBoundary) {
    allX.push(trackBoundary.inner.x, trackBoundary.outer.x);
    allY.push(trackBoundary.inner.y, trackBoundary.outer.y);
  }

  const transform = computeTransform(allX, allY);
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
          {/* Layer 1: Track surface (boundaries) */}
          {trackBoundary && <TrackSurface boundary={trackBoundary} transform={transform} />}

          {/* Layer 2: DRS zone highlights */}
          {drsZones && drsZones.length > 0 && validTraces[0] && (
            <DrsOverlay
              drsZones={drsZones}
              trace={validTraces[0]}
              transform={transform}
            />
          )}

          {/* Layer 3: Driver traces */}
          {isSingleDriver ? (
            <SingleDriverMap
              trace={validTraces[0]}
              transform={transform}
              hasBoundary={!!trackBoundary}
            />
          ) : (
            <MultiDriverMap
              traces={validTraces}
              drivers={drivers}
              transform={transform}
              hasBoundary={!!trackBoundary}
            />
          )}
        </svg>
      </div>

      {isSingleDriver && (() => {
        const speeds = validTraces[0].speed;
        return <SpeedLegend minSpeed={Math.min(...speeds)} maxSpeed={Math.max(...speeds)} speedUnit={speedUnit} />;
      })()}

      {drsZones && drsZones.length > 0 && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-sm bg-green-500/50" />
          <span className="text-[10px] text-white/40">DRS Zone</span>
        </div>
      )}

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

function TrackSurface({ boundary, transform }: { boundary: TrackBoundary; transform: Transform }) {
  const { sx: outerSx, sy: outerSy } = transform.applyArrays(boundary.outer.x, boundary.outer.y);
  const { sx: innerSx, sy: innerSy } = transform.applyArrays(boundary.inner.x, boundary.inner.y);

  // Build path: outer clockwise, then inner counter-clockwise (evenodd fill)
  const outerPath = outerSx.map((x, i) => `${i === 0 ? "M" : "L"}${x},${outerSy[i]}`).join(" ") + " Z";
  const innerPath =
    innerSx
      .slice()
      .reverse()
      .map((x, i) => {
        const y = innerSy.slice().reverse()[i];
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ") + " Z";

  return (
    <path
      d={`${outerPath} ${innerPath}`}
      fill="#1a1a1a"
      fillRule="evenodd"
      stroke="#333"
      strokeWidth={0.5}
    />
  );
}

function DrsOverlay({
  drsZones,
  trace,
  transform,
}: {
  drsZones: DrsZone[];
  trace: TelemetrySpeedTrace;
  transform: Transform;
}) {
  const distances = trace.distance;
  const xs = trace.x!;
  const ys = trace.y!;

  return (
    <>
      {drsZones.map((zone, zi) => {
        // Find indices within this zone's distance range
        const points: [number, number][] = [];
        for (let i = 0; i < distances.length; i++) {
          if (distances[i] >= zone.startDistance && distances[i] <= zone.endDistance) {
            const [tx, ty] = transform.apply(xs[i], ys[i]);
            points.push([tx, ty]);
          }
        }
        if (points.length < 2) return null;

        const path = points
          .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`)
          .join(" ");

        return (
          <path
            key={zi}
            d={path}
            fill="none"
            stroke="#22c55e"
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.5}
          />
        );
      })}
    </>
  );
}

function SingleDriverMap({
  trace,
  transform,
  hasBoundary,
}: {
  trace: TelemetrySpeedTrace;
  transform: Transform;
  hasBoundary: boolean;
}) {
  const { sx, sy } = transform.applyArrays(trace.x!, trace.y!);
  const minSpeed = Math.min(...trace.speed);
  const maxSpeed = Math.max(...trace.speed);

  const outlinePath = sx.map((x, i) => `${i === 0 ? "M" : "L"}${x},${sy[i]}`).join(" ");

  return (
    <>
      {/* Track outline — only if no boundary surface is drawn */}
      {!hasBoundary && (
        <path d={outlinePath} fill="none" stroke="#333" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      )}

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
  transform,
  hasBoundary,
}: {
  traces: TelemetrySpeedTrace[];
  drivers: TelemetryDriver[];
  transform: Transform;
  hasBoundary: boolean;
}) {
  const refTrace = traces[0];
  const { sx: refSx, sy: refSy } = transform.applyArrays(refTrace.x!, refTrace.y!);

  const outlinePath = refSx
    .map((x, i) => `${i === 0 ? "M" : "L"}${x},${refSy[i]}`)
    .join(" ");

  return (
    <>
      {/* Track outline — only if no boundary surface */}
      {!hasBoundary && (
        <path d={outlinePath} fill="none" stroke="#222" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Each driver's trace */}
      {traces.map((trace) => {
        const driver = drivers.find((d) => d.number === trace.driverNumber);
        const color = driver?.teamColor ?? "#666";
        const { sx, sy } = transform.applyArrays(trace.x!, trace.y!);
        const path = sx.map((x, i) => `${i === 0 ? "M" : "L"}${x},${sy[i]}`).join(" ");

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

const KPH_TO_MPH = 0.621371;

function SpeedLegend({ minSpeed, maxSpeed, speedUnit = "kph" }: { minSpeed: number; maxSpeed: number; speedUnit?: "kph" | "mph" }) {
  const factor = speedUnit === "mph" ? KPH_TO_MPH : 1;
  const label = speedUnit === "mph" ? "mph" : "km/h";
  return (
    <div className="mt-3 flex items-center justify-center gap-2">
      <span className="text-[10px] text-white/40">{Math.round(minSpeed * factor)} {label}</span>
      <div
        className="h-2.5 w-32 rounded-full"
        style={{
          background: "linear-gradient(to right, hsl(0,85%,50%), hsl(60,85%,50%), hsl(120,85%,50%))",
        }}
      />
      <span className="text-[10px] text-white/40">{Math.round(maxSpeed * factor)} {label}</span>
    </div>
  );
}
