"use client";

import { memo } from "react";
import type { OpenF1TeamRadio, OpenF1Driver } from "@/app/types/openf1";
import RadioClipPlayer from "@/app/components/shared/RadioClipPlayer";

interface TeamRadioFeedProps {
  messages: OpenF1TeamRadio[];
  drivers: OpenF1Driver[];
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default memo(function TeamRadioFeed({
  messages,
  drivers,
}: TeamRadioFeedProps) {
  const recent = [...messages].reverse().slice(0, 30);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">
        Team Radio
      </h3>
      <p className="mb-3 text-[11px] text-white/20">
        Includes only radio messages broadcast during TV coverage.
      </p>
      {recent.length === 0 ? (
        <p className="text-sm text-white/30">No radio messages</p>
      ) : (
        <div className="max-h-[300px] space-y-2 overflow-y-auto">
          {recent.map((msg, i) => {
            const driver = drivers.find(
              (d) => d.driver_number === msg.driver_number,
            );
            return (
              <RadioClipPlayer
                key={`${msg.date}-${msg.driver_number}-${i}`}
                audioUrl={msg.recording_url}
                abbreviation={driver?.name_acronym ?? `#${msg.driver_number}`}
                teamColor={driver ? `#${driver.team_colour}` : "#666"}
                label={formatTime(msg.date)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});
