"use client";

import { useEffect, useState } from "react";
import { usePreferencesStore } from "@/app/stores/preferences";

interface SessionTimeProps {
  label: string;
  date: string;
  time: string;
  circuitTimezone?: string;
}

export default function SessionTime({ label, date, time, circuitTimezone }: SessionTimeProps) {
  const timeFormat = usePreferencesStore((s) => s.timeFormat);
  const [times, setTimes] = useState<{ circuit: string | null; local: string | null }>({
    circuit: null,
    local: null,
  });

  useEffect(() => {
    const utc = new Date(`${date}T${time}`);
    const hour12 = timeFormat === "12h";

    const localFormatted = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12,
      timeZoneName: "short",
    }).format(utc);

    let circuitFormatted: string | null = null;
    if (circuitTimezone) {
      circuitFormatted = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12,
        timeZoneName: "short",
        timeZone: circuitTimezone,
      }).format(utc);
    }

    // If circuit time is identical to local time, don't show both
    if (circuitFormatted === localFormatted) {
      circuitFormatted = null;
    }

    setTimes({ circuit: circuitFormatted, local: localFormatted });
  }, [date, time, circuitTimezone, timeFormat]);

  return (
    <div className="flex items-start justify-between gap-2 py-1.5 text-sm">
      <span className="shrink-0 text-white/50">{label}</span>
      {/* Fixed min-height prevents CLS when localTime hydrates from null → formatted string */}
      <div className="min-h-[1.25rem] text-right">
        {times.circuit ? (
          <>
            <span className="font-medium text-white/80">{times.circuit}</span>
            <span className="mx-1.5 text-white/20">&middot;</span>
            <span className="text-white/40">{times.local}</span>
          </>
        ) : (
          <span className="font-medium text-white/80">
            {times.local ?? "\u2014"}
          </span>
        )}
      </div>
    </div>
  );
}
