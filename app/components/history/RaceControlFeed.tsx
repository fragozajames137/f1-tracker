"use client";

import { useState, useEffect } from "react";

interface RaceControlMessage {
  utc: string | null;
  lapNumber: number | null;
  category: string | null;
  flag: string | null;
  message: string;
}

interface RaceControlFeedProps {
  sessionKey: number;
}

function getFlagStyle(flag?: string | null): string {
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

function getCategoryBadge(category: string | null): string | null {
  switch (category) {
    case "SafetyCar":
      return "SC";
    case "VirtualSafetyCar":
      return "VSC";
    default:
      return null;
  }
}

function formatTime(utc: string): string {
  const d = new Date(utc);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function RaceControlFeed({ sessionKey }: RaceControlFeedProps) {
  const [data, setData] = useState<RaceControlMessage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/sessions/${sessionKey}/race-control`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch(() => setError("Failed to load race control messages"))
      .finally(() => setLoading(false));
  }, [sessionKey]);

  if (loading) {
    return <p className="py-8 text-center text-sm text-white/40">Loading race control...</p>;
  }

  if (error || !data) {
    return <p className="py-8 text-center text-sm text-red-400">{error ?? "No data"}</p>;
  }

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-white/30">No race control messages</p>;
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
        Race Control
      </h3>
      <div className="max-h-[400px] space-y-2 overflow-y-auto">
        {data.map((msg, i) => {
          const badge = getCategoryBadge(msg.category);
          return (
            <div
              key={`${msg.utc}-${i}`}
              className={`rounded border px-3 py-2 text-sm ${getFlagStyle(msg.flag)}`}
            >
              <div className="flex items-start gap-2">
                {badge && (
                  <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                    {badge}
                  </span>
                )}
                {msg.lapNumber !== null && (
                  <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold">
                    L{msg.lapNumber}
                  </span>
                )}
                <p className="flex-1">{msg.message}</p>
                {msg.utc && (
                  <span className="shrink-0 text-xs opacity-60">
                    {formatTime(msg.utc)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
