"use client";

import { useState } from "react";
import type { DOTDDriverStats, DOTDHighlights, DOTDRace } from "@/app/types/dotd";
import LeaderboardView from "./LeaderboardView";
import TimelineView from "./TimelineView";

type View = "leaderboard" | "results";

interface FanFavoritesTrackerProps {
  leaderboard: DOTDDriverStats[];
  highlights: DOTDHighlights;
  races: DOTDRace[];
}

export default function FanFavoritesTracker({
  leaderboard,
  highlights,
  races,
}: FanFavoritesTrackerProps) {
  const [view, setView] = useState<View>("leaderboard");

  const tabs: { key: View; label: string }[] = [
    { key: "leaderboard", label: "Leaderboard" },
    { key: "results", label: "Results" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-lg bg-white/5 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              view === tab.key
                ? "bg-white/15 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === "leaderboard" && (
        <LeaderboardView leaderboard={leaderboard} highlights={highlights} />
      )}
      {view === "results" && <TimelineView races={races} />}
    </div>
  );
}
