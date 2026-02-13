"use client";

import { OpenF1Session } from "@/app/types/openf1";

interface SessionSelectorProps {
  sessions: OpenF1Session[];
  selectedSessionKey: number | null;
  onSessionChange: (sessionKey: number) => void;
}

export default function SessionSelector({
  sessions,
  selectedSessionKey,
  onSessionChange,
}: SessionSelectorProps) {
  return (
    <div className="flex items-center">
      <select
        value={selectedSessionKey ?? ""}
        onChange={(e) => onSessionChange(Number(e.target.value))}
        disabled={sessions.length === 0}
        aria-label="Select session"
        className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 disabled:opacity-40 sm:w-auto sm:min-w-[280px]"
      >
        {sessions.length === 0 ? (
          <option className="bg-[#111]">No sessions</option>
        ) : (
          sessions.map((s) => {
            const isUpcoming = "_upcoming" in s && (s as Record<string, unknown>)._upcoming === true;
            return (
              <option key={s.session_key} value={s.session_key} className="bg-[#111]">
                {s.location} — {s.session_name}
                {isUpcoming ? " (upcoming)" : ""}
              </option>
            );
          })
        )}
      </select>
    </div>
  );
}
