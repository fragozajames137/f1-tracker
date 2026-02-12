"use client";

import { OpenF1Session } from "@/app/types/openf1";

interface SessionSelectorProps {
  year: number;
  sessions: OpenF1Session[];
  selectedSessionKey: number | null;
  onYearChange: (year: number) => void;
  onSessionChange: (sessionKey: number) => void;
}

const YEARS = [2026, 2025, 2024, 2023];

export default function SessionSelector({
  year,
  sessions,
  selectedSessionKey,
  onYearChange,
  onSessionChange,
}: SessionSelectorProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <select
        value={year}
        onChange={(e) => onYearChange(Number(e.target.value))}
        aria-label="Select year"
        className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 sm:w-auto"
      >
        {YEARS.map((y) => (
          <option key={y} value={y} className="bg-[#111]">
            {y}
          </option>
        ))}
      </select>

      <select
        value={selectedSessionKey ?? ""}
        onChange={(e) => onSessionChange(Number(e.target.value))}
        disabled={sessions.length === 0}
        aria-label="Select session"
        className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 disabled:opacity-40 sm:w-auto sm:min-w-[200px]"
      >
        {sessions.length === 0 ? (
          <option className="bg-[#111]">No sessions</option>
        ) : (
          sessions.map((s) => (
            <option key={s.session_key} value={s.session_key} className="bg-[#111]">
              {s.location} — {s.session_name}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
