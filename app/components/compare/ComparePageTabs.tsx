"use client";

import { useState } from "react";
import type { TelemetrySession, TelemetryFileInfo } from "@/app/types/telemetry";
import type { F1HistoricalDriver } from "@/app/types/f1-reference";
import CompareDashboard from "./CompareDashboard";
import SeasonCompare from "./SeasonCompare";
import CareerCompare from "./CareerCompare";

type TabKey = "race" | "season" | "career";

const TABS: { key: TabKey; label: string }[] = [
  { key: "race", label: "Race" },
  { key: "season", label: "Season" },
  { key: "career", label: "Career" },
];

interface GridDriver {
  id: string;
  name: string;
  teamColor: string;
}

interface ComparePageTabsProps {
  files: TelemetryFileInfo[];
  initialSession: TelemetrySession | null;
  gridDrivers: GridDriver[];
  historicalDrivers: Record<string, F1HistoricalDriver>;
}

export default function ComparePageTabs({
  files,
  initialSession,
  gridDrivers,
  historicalDrivers,
}: ComparePageTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("race");

  return (
    <div>
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Comparison mode"
        className="mb-6 flex gap-1 border-b border-white/10"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`cursor-pointer px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-white text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div role="tabpanel">
        {activeTab === "race" && (
          <CompareDashboard files={files} initialSession={initialSession} />
        )}
        {activeTab === "season" && (
          <SeasonCompare gridDrivers={gridDrivers} />
        )}
        {activeTab === "career" && (
          <CareerCompare
            gridDrivers={gridDrivers}
            historicalDrivers={historicalDrivers}
          />
        )}
      </div>
    </div>
  );
}
