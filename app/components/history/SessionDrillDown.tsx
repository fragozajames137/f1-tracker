"use client";

import { useState } from "react";
import LapChart from "./LapChart";
import StrategyTimeline from "./StrategyTimeline";
import PitStopTable from "./PitStopTable";
import WeatherChart from "./WeatherChart";
import RaceControlFeed from "./RaceControlFeed";
import TeamRadioTab from "./TeamRadioTab";
import SpeedTrapTab from "./SpeedTrapTab";
import TrackLimitsTab from "./TrackLimitsTab";

type Tab = "lap-chart" | "strategy" | "pit-stops" | "speed-traps" | "weather" | "race-control" | "track-limits" | "team-radio";

const TABS: { key: Tab; label: string }[] = [
  { key: "lap-chart", label: "Lap Chart" },
  { key: "strategy", label: "Strategy" },
  { key: "pit-stops", label: "Pit Stops" },
  { key: "speed-traps", label: "Speed Traps" },
  { key: "weather", label: "Weather" },
  { key: "race-control", label: "Race Control" },
  { key: "track-limits", label: "Track Limits" },
  { key: "team-radio", label: "Team Radio" },
];

interface SessionDrillDownProps {
  sessionKey: number;
  onClose: () => void;
}

export default function SessionDrillDown({ sessionKey, onClose }: SessionDrillDownProps) {
  const [activeTab, setActiveTab] = useState<Tab>("lap-chart");

  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div role="tablist" aria-label="Session data" className="flex overflow-hidden rounded-lg border border-white/10">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="cursor-pointer rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close session details"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "lap-chart" && <LapChart sessionKey={sessionKey} />}
      {activeTab === "strategy" && <StrategyTimeline sessionKey={sessionKey} />}
      {activeTab === "pit-stops" && <PitStopTable sessionKey={sessionKey} />}
      {activeTab === "weather" && <WeatherChart sessionKey={sessionKey} />}
      {activeTab === "speed-traps" && <SpeedTrapTab sessionKey={sessionKey} />}
      {activeTab === "race-control" && <RaceControlFeed sessionKey={sessionKey} />}
      {activeTab === "track-limits" && <TrackLimitsTab sessionKey={sessionKey} />}
      {activeTab === "team-radio" && <TeamRadioTab sessionKey={sessionKey} />}
    </div>
  );
}
