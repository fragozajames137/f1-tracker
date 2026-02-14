"use client";

import { Rumor, Team, Driver } from "@/app/types";
import RumorCard from "./RumorCard";

interface RumorEntry {
  rumor: Rumor;
  driverName: string;
  teamColor: string;
}

interface TimelineFeedProps {
  entries: RumorEntry[];
}

export default function TimelineFeed({ entries }: TimelineFeedProps) {
  if (!entries.length) {
    return (
      <p className="text-sm text-white/30 italic text-center py-12">
        No rumors at the moment. Check back during the season.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <RumorCard
          key={i}
          rumor={entry.rumor}
          driverName={entry.driverName}
          teamColor={entry.teamColor}
        />
      ))}
    </div>
  );
}
