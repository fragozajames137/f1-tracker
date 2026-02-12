"use client";

import type { DriverMetrics } from "@/app/lib/compare";

interface StatBarsProps {
  driverA: DriverMetrics;
  driverB: DriverMetrics;
}

interface MetricRow {
  label: string;
  valueA: number | null;
  valueB: number | null;
  format: (v: number) => string;
  lowerIsBetter: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}:${secs.toFixed(3).padStart(6, "0")}`;
  return secs.toFixed(3);
}

function formatPosition(pos: number): string {
  return `P${pos}`;
}

function formatSpeed(speed: number): string {
  return `${Math.round(speed)} kph`;
}

function formatCount(n: number): string {
  return `${n}`;
}

function formatConsistency(s: number): string {
  return `±${s.toFixed(3)}s`;
}

export default function StatBars({ driverA, driverB }: StatBarsProps) {
  const metrics: MetricRow[] = [
    {
      label: "Finish",
      valueA: driverA.finishPosition,
      valueB: driverB.finishPosition,
      format: formatPosition,
      lowerIsBetter: true,
    },
    {
      label: "Fastest Lap",
      valueA: driverA.fastestLap,
      valueB: driverB.fastestLap,
      format: formatTime,
      lowerIsBetter: true,
    },
    {
      label: "Best S1",
      valueA: driverA.bestSector1,
      valueB: driverB.bestSector1,
      format: formatTime,
      lowerIsBetter: true,
    },
    {
      label: "Best S2",
      valueA: driverA.bestSector2,
      valueB: driverB.bestSector2,
      format: formatTime,
      lowerIsBetter: true,
    },
    {
      label: "Best S3",
      valueA: driverA.bestSector3,
      valueB: driverB.bestSector3,
      format: formatTime,
      lowerIsBetter: true,
    },
    {
      label: "Avg Pace",
      valueA: driverA.averagePace,
      valueB: driverB.averagePace,
      format: formatTime,
      lowerIsBetter: true,
    },
    {
      label: "Consistency",
      valueA: driverA.consistency,
      valueB: driverB.consistency,
      format: formatConsistency,
      lowerIsBetter: true,
    },
    {
      label: "Top Speed",
      valueA: driverA.topSpeed,
      valueB: driverB.topSpeed,
      format: formatSpeed,
      lowerIsBetter: false,
    },
    {
      label: "Pit Stops",
      valueA: driverA.pitStopCount,
      valueB: driverB.pitStopCount,
      format: formatCount,
      lowerIsBetter: true,
    },
  ];

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        Head-to-Head Stats
      </h3>
      <div className="space-y-2">
        {/* Driver name headers */}
        <div className="flex items-center justify-between px-1 pb-1">
          <span
            className="text-sm font-bold"
            style={{ color: driverA.teamColor }}
          >
            {driverA.abbreviation}
          </span>
          <span
            className="text-sm font-bold"
            style={{ color: driverB.teamColor }}
          >
            {driverB.abbreviation}
          </span>
        </div>

        {metrics.map(({ label, valueA, valueB, format, lowerIsBetter }) => {
          if (valueA === null && valueB === null) return null;

          const aWins =
            valueA !== null && valueB !== null
              ? lowerIsBetter
                ? valueA < valueB
                : valueA > valueB
              : valueA !== null;
          const bWins =
            valueA !== null && valueB !== null
              ? lowerIsBetter
                ? valueB < valueA
                : valueB > valueA
              : valueB !== null;
          const tie = valueA !== null && valueB !== null && valueA === valueB;

          // Bar widths: winner gets 100%, loser proportional
          const maxBarWidth = 100;
          let barWidthA = 0;
          let barWidthB = 0;

          if (valueA !== null && valueB !== null && valueA !== valueB) {
            const min = Math.min(
              Math.abs(valueA),
              Math.abs(valueB),
            );
            const max = Math.max(
              Math.abs(valueA),
              Math.abs(valueB),
            );
            const ratio = max > 0 ? min / max : 1;

            if (aWins) {
              barWidthA = maxBarWidth;
              barWidthB = Math.max(ratio * maxBarWidth, 30);
            } else {
              barWidthB = maxBarWidth;
              barWidthA = Math.max(ratio * maxBarWidth, 30);
            }
          } else {
            barWidthA = maxBarWidth;
            barWidthB = maxBarWidth;
          }

          return (
            <div key={label} className="flex items-center gap-2">
              {/* Driver A side */}
              <div className="flex flex-1 items-center justify-end gap-2">
                <span
                  className="font-mono text-[11px] font-medium shrink-0"
                  style={{
                    color: driverA.teamColor,
                    opacity: aWins || tie ? 1 : 0.4,
                  }}
                >
                  {valueA !== null ? format(valueA) : "—"}
                </span>
                <div className="h-4 w-full max-w-[120px] sm:max-w-[160px]">
                  <div
                    className="ml-auto h-full rounded-l-sm transition-all"
                    style={{
                      width: `${barWidthA}%`,
                      backgroundColor: driverA.teamColor,
                      opacity: aWins || tie ? 0.7 : 0.2,
                    }}
                  />
                </div>
              </div>

              {/* Metric label */}
              <span className="w-20 shrink-0 text-center text-[10px] font-semibold uppercase tracking-wider text-white/40 sm:w-24 sm:text-xs">
                {label}
              </span>

              {/* Driver B side */}
              <div className="flex flex-1 items-center gap-2">
                <div className="h-4 w-full max-w-[120px] sm:max-w-[160px]">
                  <div
                    className="h-full rounded-r-sm transition-all"
                    style={{
                      width: `${barWidthB}%`,
                      backgroundColor: driverB.teamColor,
                      opacity: bWins || tie ? 0.7 : 0.2,
                    }}
                  />
                </div>
                <span
                  className="font-mono text-[11px] font-medium shrink-0"
                  style={{
                    color: driverB.teamColor,
                    opacity: bWins || tie ? 1 : 0.4,
                  }}
                >
                  {valueB !== null ? format(valueB) : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
