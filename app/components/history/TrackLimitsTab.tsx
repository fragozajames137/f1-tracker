"use client";

import { useState, useEffect, useMemo } from "react";

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

interface DriverViolation {
  driverNumber: number;
  abbreviation: string;
  teamColor: string;
  violations: { lapNumber: number | null; message: string }[];
  count: number;
}

const TRACK_LIMITS_RE = /TRACK LIMITS/i;
const CAR_NUMBER_RE = /CAR\s+(\d+)/i;

interface TrackLimitsTabProps {
  sessionKey: number;
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

export default function TrackLimitsTab({ sessionKey }: TrackLimitsTabProps) {
  const [data, setData] = useState<RaceControlMessage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/sessions/${sessionKey}/race-control`, { signal: ac.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((e) => { if (!ac.signal.aborted) setError("Failed to load race control data"); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [sessionKey]);

  const trackLimits = useMemo((): DriverViolation[] => {
    if (!data) return [];

    // Parse track limit violations from race control messages
    const violations: { driverNumber: number; lapNumber: number | null; message: string }[] = [];

    for (const msg of data) {
      if (!TRACK_LIMITS_RE.test(msg.message)) continue;

      let driverNumber = msg.driverNumber ?? 0;
      if (!driverNumber) {
        const match = msg.message.match(CAR_NUMBER_RE);
        if (match) driverNumber = parseInt(match[1], 10);
      }
      if (driverNumber <= 0) continue;

      violations.push({
        driverNumber,
        lapNumber: msg.lapNumber,
        message: msg.message,
      });
    }

    // Group by driver
    const byDriver = new Map<number, typeof violations>();
    for (const v of violations) {
      const list = byDriver.get(v.driverNumber) ?? [];
      list.push(v);
      byDriver.set(v.driverNumber, list);
    }

    // Sort by count descending
    return Array.from(byDriver.entries())
      .map(([driverNumber, driverViolations]) => {
        // Extract abbreviation from message (e.g., "TRACK LIMITS - CAR 1 (VER)")
        const abbrMatch = driverViolations[0]?.message.match(/\((\w+)\)/);
        const abbreviation = abbrMatch ? abbrMatch[1] : `#${driverNumber}`;

        return {
          driverNumber,
          abbreviation,
          teamColor: "666666",
          violations: driverViolations.map((v) => ({
            lapNumber: v.lapNumber,
            message: v.message,
          })),
          count: driverViolations.length,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [data]);

  if (loading) {
    return <p className="py-8 text-center text-sm text-white/40">Loading track limits...</p>;
  }

  if (error || !data) {
    return <p className="py-8 text-center text-sm text-red-400">{error ?? "No data"}</p>;
  }

  if (trackLimits.length === 0) {
    return <p className="py-8 text-center text-sm text-white/30">No track limit violations in this session</p>;
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
        Track Limits
      </h3>
      <div className="max-h-[400px] space-y-2 overflow-y-auto">
        {trackLimits.map((entry) => {
          const isWarning = entry.count >= 3 && entry.count < 5;
          const hasPenalty = entry.count >= 5;
          const isExpanded = expanded === entry.driverNumber;

          return (
            <div key={entry.driverNumber}>
              <button
                onClick={() =>
                  setExpanded(isExpanded ? null : entry.driverNumber)
                }
                className={`flex w-full cursor-pointer items-center gap-3 rounded px-3 py-2 text-sm transition-colors ${
                  hasPenalty
                    ? "border border-red-500/30 bg-red-500/5"
                    : isWarning
                      ? "border border-yellow-500/30 bg-white/[0.02]"
                      : "border border-white/5 bg-white/[0.02]"
                }`}
              >
                <span className="w-10 text-left font-semibold text-white">
                  {entry.abbreviation}
                </span>
                <SeverityDots count={entry.count} />
                <span className="text-xs tabular-nums text-white/40">
                  {entry.count}
                </span>
                {hasPenalty && (
                  <span className="ml-auto rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
                    5s PENALTY
                  </span>
                )}
                <svg
                  className={`ml-auto h-3 w-3 text-white/30 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  {entry.violations.map((v, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-[11px] text-white/40"
                    >
                      {v.lapNumber !== null && (
                        <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold">
                          L{v.lapNumber}
                        </span>
                      )}
                      <span className="truncate">{v.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-right text-[10px] text-white/20">
        {trackLimits.reduce((sum, d) => sum + d.count, 0)} total violations
      </div>
    </div>
  );
}
