"use client";

import { useState, useEffect, useMemo } from "react";
import RadioClipPlayer from "@/app/components/shared/RadioClipPlayer";

interface RadioDriver {
  number: number;
  abbreviation: string;
  fullName: string;
  teamName: string;
  teamColor: string | null;
}

interface RadioMessage {
  driverNumber: number;
  timestamp: string;
  audioUrl: string;
}

interface TeamRadioData {
  messages: RadioMessage[];
  drivers: RadioDriver[];
}

interface TeamRadioTabProps {
  sessionKey: number;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function TeamRadioTab({ sessionKey }: TeamRadioTabProps) {
  const [data, setData] = useState<TeamRadioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    setSelectedDriver(null);
    fetch(`/api/sessions/${sessionKey}/team-radio`, { signal: ac.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((e) => { if (!ac.signal.aborted) setError("Failed to load team radio"); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [sessionKey]);

  // Drivers that have at least one radio message
  const activeDrivers = useMemo(() => {
    if (!data) return [];
    const driverNums = new Set(data.messages.map((m) => m.driverNumber));
    return data.drivers.filter((d) => driverNums.has(d.number));
  }, [data]);

  const filteredMessages = useMemo(() => {
    if (!data) return [];
    if (selectedDriver === null) return data.messages;
    return data.messages.filter((m) => m.driverNumber === selectedDriver);
  }, [data, selectedDriver]);

  if (loading) {
    return <p className="py-8 text-center text-sm text-white/40">Loading team radio...</p>;
  }

  if (error || !data) {
    return <p className="py-8 text-center text-sm text-red-400">{error ?? "No data"}</p>;
  }

  if (data.messages.length === 0) {
    return <p className="py-8 text-center text-sm text-white/30">No team radio messages for this session</p>;
  }

  const driverMap = new Map(data.drivers.map((d) => [d.number, d]));

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">
        Team Radio
      </h3>
      <p className="mb-3 text-[11px] text-white/20">
        Includes only radio messages broadcast during TV coverage.
      </p>

      {/* Driver filter chips */}
      {activeDrivers.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedDriver(null)}
            className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
              selectedDriver === null
                ? "bg-white/15 text-white"
                : "bg-white/5 text-white/40 hover:text-white/60"
            }`}
          >
            All ({data.messages.length})
          </button>
          {activeDrivers.map((d) => {
            const count = data.messages.filter((m) => m.driverNumber === d.number).length;
            const isActive = selectedDriver === d.number;
            return (
              <button
                key={d.number}
                onClick={() => setSelectedDriver(isActive ? null : d.number)}
                className="cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors"
                style={{
                  backgroundColor: isActive
                    ? `${d.teamColor ?? "#666"}30`
                    : "rgba(255,255,255,0.03)",
                  color: isActive
                    ? d.teamColor ?? "#fff"
                    : "rgba(255,255,255,0.4)",
                  borderWidth: "1px",
                  borderColor: isActive
                    ? `${d.teamColor ?? "#666"}50`
                    : "transparent",
                }}
              >
                {d.abbreviation} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Radio messages */}
      <div className="max-h-[400px] space-y-2 overflow-y-auto">
        {filteredMessages.map((msg, i) => {
          const driver = driverMap.get(msg.driverNumber);
          return (
            <RadioClipPlayer
              key={`${msg.timestamp}-${msg.driverNumber}-${i}`}
              audioUrl={msg.audioUrl}
              abbreviation={driver?.abbreviation ?? `#${msg.driverNumber}`}
              teamColor={driver?.teamColor ?? "#666"}
              label={msg.timestamp ? formatTime(msg.timestamp) : undefined}
            />
          );
        })}
      </div>

      <div className="mt-2 text-right text-[10px] text-white/20">
        {filteredMessages.length} clip{filteredMessages.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
