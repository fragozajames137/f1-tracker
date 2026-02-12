"use client";

import { memo, useMemo } from "react";
import type {
  OpenF1RaceControl,
  OpenF1Driver,
  OpenF1Position,
  OpenF1Interval,
  DriverTrackLimits,
} from "@/app/types/openf1";
import {
  parseTrackLimitViolations,
  computeDriverTrackLimits,
} from "@/app/lib/track-limits";

interface TrackLimitsPanelProps {
  raceControl: OpenF1RaceControl[];
  drivers: OpenF1Driver[];
  positions: OpenF1Position[];
  intervals: OpenF1Interval[];
}

function SeverityDots({ count }: { count: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < count;
        let colorClass = "bg-white/10";
        if (filled) {
          if (i < 2) colorClass = "bg-white/40";
          else if (i === 2) colorClass = "bg-yellow-500";
          else if (i === 3) colorClass = "bg-orange-500";
          else colorClass = "bg-red-500";
        }
        return (
          <span
            key={i}
            className={`h-2 w-2 rounded-full ${colorClass}`}
          />
        );
      })}
    </div>
  );
}

function PenaltyBadge({ entry }: { entry: DriverTrackLimits }) {
  if (!entry.hasPenalty || entry.predictedNewPosition === null) return null;

  const currentPos =
    entry.predictedNewPosition - (entry.predictedPositionDelta ?? 0);

  return (
    <span className="ml-auto rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
      P{currentPos} → P{entry.predictedNewPosition}{" "}
      ({entry.predictedPositionDelta! > 0 ? "-" : "+"}
      {Math.abs(entry.predictedPositionDelta!)})
    </span>
  );
}

export default memo(function TrackLimitsPanel({
  raceControl,
  drivers,
  positions,
  intervals,
}: TrackLimitsPanelProps) {
  const trackLimits = useMemo(() => {
    const violations = parseTrackLimitViolations(raceControl);
    return computeDriverTrackLimits(violations, drivers, positions, intervals);
  }, [raceControl, drivers, positions, intervals]);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
        Track Limits
      </h3>
      {trackLimits.length === 0 ? (
        <p className="text-sm text-white/30">No violations</p>
      ) : (
        <div className="max-h-[300px] space-y-2 overflow-y-auto">
          {trackLimits.map((entry) => {
            const isWarning = entry.count >= 3 && entry.count < 5;
            return (
              <div
                key={entry.driver_number}
                className={`flex items-center gap-3 rounded px-3 py-2 text-sm ${
                  isWarning
                    ? "border border-yellow-500/30 bg-white/[0.02]"
                    : entry.hasPenalty
                      ? "border border-red-500/30 bg-red-500/5"
                      : "border border-white/5 bg-white/[0.02]"
                }`}
              >
                <div
                  className="h-3 w-1 rounded-full"
                  style={{ backgroundColor: `#${entry.team_colour}` }}
                />
                <span className="w-8 font-semibold text-white">
                  {entry.name_acronym}
                </span>
                <SeverityDots count={entry.count} />
                <span className="text-xs tabular-nums text-white/40">
                  {entry.count}
                </span>
                <PenaltyBadge entry={entry} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
