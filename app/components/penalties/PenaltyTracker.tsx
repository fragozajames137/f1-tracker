"use client";

import { useState } from "react";
import type { DriverPenaltySummary, Incident, ConsistencyGroup } from "@/app/types/penalties";
import ActivePointsView from "./ActivePointsView";
import IncidentsView from "./IncidentsView";
import ConsistencyView from "./ConsistencyView";

type View = "points" | "incidents" | "consistency";

interface PenaltyTrackerProps {
  summaries: DriverPenaltySummary[];
  incidents: Incident[];
  consistencyGroups: ConsistencyGroup[];
}

export default function PenaltyTracker({
  summaries,
  incidents,
  consistencyGroups,
}: PenaltyTrackerProps) {
  const [view, setView] = useState<View>("points");

  const tabs: { key: View; label: string }[] = [
    { key: "points", label: "Active Points" },
    { key: "incidents", label: "Incidents" },
    { key: "consistency", label: "Consistency" },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-lg bg-white/5 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={`flex-1 cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              view === tab.key
                ? "bg-white/15 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* View Content */}
      {view === "points" && <ActivePointsView summaries={summaries} />}
      {view === "incidents" && (
        <IncidentsView incidents={incidents} summaries={summaries} />
      )}
      {view === "consistency" && (
        <ConsistencyView groups={consistencyGroups} summaries={summaries} />
      )}
    </div>
  );
}
