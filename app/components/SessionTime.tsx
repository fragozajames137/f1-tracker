"use client";

import { useEffect, useState } from "react";

interface SessionTimeProps {
  label: string;
  date: string;
  time: string;
}

export default function SessionTime({ label, date, time }: SessionTimeProps) {
  const [localTime, setLocalTime] = useState<string | null>(null);

  useEffect(() => {
    const utc = new Date(`${date}T${time}`);
    const formatted = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(utc);
    setLocalTime(formatted);
  }, [date, time]);

  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-white/50">{label}</span>
      {/* Fixed min-height prevents CLS when localTime hydrates from null → formatted string */}
      <span className="min-h-[1.25rem] font-medium text-white/80">
        {localTime ?? "\u2014"}
      </span>
    </div>
  );
}
