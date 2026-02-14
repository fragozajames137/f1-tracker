"use client";

import { useState, useMemo } from "react";
import { GridData } from "@/app/types";
import TimelineFeed from "./TimelineFeed";
import ContractGrid from "./ContractGrid";

type View = "timeline" | "grid";

interface SillySeasonTrackerProps {
  data: GridData;
}

export default function SillySeasonTracker({ data }: SillySeasonTrackerProps) {
  const [view, setView] = useState<View>("timeline");

  const allRumors = useMemo(() => {
    const entries = data.teams.flatMap((team) =>
      [team.seat1, team.seat2].flatMap((driver) =>
        driver.rumors.map((rumor) => ({
          rumor,
          driverName: driver.name,
          teamColor: team.color,
        })),
      ),
    );
    return entries.sort(
      (a, b) => new Date(b.rumor.date).getTime() - new Date(a.rumor.date).getTime(),
    );
  }, [data]);

  return (
    <div>
      {/* View toggle */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setView("timeline")}
          className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            view === "timeline"
              ? "bg-white/15 text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          Timeline
        </button>
        <button
          onClick={() => setView("grid")}
          className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            view === "grid"
              ? "bg-white/15 text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          Contract Grid
        </button>
      </div>

      {view === "timeline" ? (
        <TimelineFeed entries={allRumors} />
      ) : (
        <ContractGrid data={data} />
      )}
    </div>
  );
}
