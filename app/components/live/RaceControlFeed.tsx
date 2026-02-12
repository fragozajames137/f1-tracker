"use client";

import { memo } from "react";
import { OpenF1RaceControl } from "@/app/types/openf1";

interface RaceControlFeedProps {
  messages: OpenF1RaceControl[];
}

function getFlagStyle(flag?: string): string {
  switch (flag) {
    case "YELLOW":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
    case "DOUBLE YELLOW":
      return "border-yellow-500/50 bg-yellow-500/20 text-yellow-300";
    case "RED":
      return "border-red-500/30 bg-red-500/10 text-red-400";
    case "GREEN":
      return "border-green-500/30 bg-green-500/10 text-green-400";
    case "BLUE":
      return "border-blue-500/30 bg-blue-500/10 text-blue-400";
    case "BLACK AND WHITE":
      return "border-white/30 bg-white/10 text-white/80";
    case "CHEQUERED":
      return "border-white/40 bg-white/10 text-white";
    default:
      return "border-white/10 bg-white/5 text-white/70";
  }
}

function getCategoryBadge(category: string): string | null {
  switch (category) {
    case "SafetyCar":
      return "SC";
    case "VirtualSafetyCar":
      return "VSC";
    case "Flag":
      return null;
    default:
      return null;
  }
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default memo(function RaceControlFeed({
  messages,
}: RaceControlFeedProps) {
  const recent = [...messages].reverse().slice(0, 30);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
        Race Control
      </h3>
      {recent.length === 0 ? (
        <p className="text-sm text-white/30">No messages</p>
      ) : (
        <div className="max-h-[300px] space-y-2 overflow-y-auto">
          {recent.map((msg, i) => {
            const badge = getCategoryBadge(msg.category);
            return (
              <div
                key={`${msg.date}-${i}`}
                className={`rounded border px-3 py-2 text-sm ${getFlagStyle(msg.flag)}`}
              >
                <div className="flex items-start gap-2">
                  {badge && (
                    <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                      {badge}
                    </span>
                  )}
                  <p className="flex-1">{msg.message}</p>
                  <span className="shrink-0 text-xs opacity-60">
                    {formatTime(msg.date)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
})
