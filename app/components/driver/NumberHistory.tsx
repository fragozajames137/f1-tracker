"use client";

import type { DriverNumberUsage } from "@/app/lib/grid-data";

interface NumberHistoryProps {
  usages: DriverNumberUsage[];
  currentNumber: number | null;
  teamColor: string;
}

export default function NumberHistory({ usages, currentNumber, teamColor }: NumberHistoryProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
        Number History
      </h3>
      <div className="space-y-2">
        {usages.map((usage) => {
          const isCurrent = usage.number === currentNumber;
          const yearRange =
            usage.lastUsed === "active"
              ? `${usage.firstUsed}–present`
              : usage.firstUsed === usage.lastUsed
                ? `${usage.firstUsed}`
                : `${usage.firstUsed}–${usage.lastUsed}`;

          return (
            <div
              key={`${usage.number}-${usage.firstUsed}`}
              className={`flex items-center justify-between rounded px-3 py-2 text-sm ${
                isCurrent ? "border border-white/10 bg-white/5" : ""
              }`}
              style={isCurrent ? { borderColor: `${teamColor}30` } : undefined}
            >
              <div className="flex items-center gap-2">
                {isCurrent && (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: teamColor }}
                  />
                )}
                <span className={`font-mono text-base ${isCurrent ? "font-bold text-white" : "font-medium text-white/70"}`}>
                  #{usage.number}
                </span>
                {usage.asChampion && (
                  <span className="text-[10px] text-yellow-400">as WDC</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">{yearRange}</span>
                {usage.note && (
                  <span className="text-[10px] text-white/30 italic">{usage.note}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
