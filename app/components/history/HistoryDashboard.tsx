"use client";

import { useState, useRef, useCallback } from "react";
import type { HistoryData } from "@/app/types/history";
import SeasonSelector from "./SeasonSelector";
import StandingsView from "./StandingsView";
import RaceResultsView from "./RaceResultsView";

type Tab = "standings" | "results";

interface HistoryDashboardProps {
  seasons: number[];
  initialData: HistoryData;
}

export default function HistoryDashboard({
  seasons,
  initialData,
}: HistoryDashboardProps) {
  const [data, setData] = useState<HistoryData>(initialData);
  const [selectedSeason, setSelectedSeason] = useState(initialData.season);
  const [activeTab, setActiveTab] = useState<Tab>("standings");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const cacheRef = useRef(new Map<number, HistoryData>());
  if (!cacheRef.current.has(initialData.season)) {
    cacheRef.current.set(initialData.season, initialData);
  }

  const handleSeasonChange = useCallback(async (year: number) => {
    setSelectedSeason(year);

    const cached = cacheRef.current.get(year);
    if (cached) {
      setData(cached);
      return;
    }

    setLoading(true);
    setFetchError(null);

    try {
      const res = await fetch(`/api/history/${year}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const historyData: HistoryData = await res.json();
      cacheRef.current.set(year, historyData);
      setData(historyData);
    } catch {
      setFetchError("Failed to load season data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Controls row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SeasonSelector
          seasons={seasons}
          selected={selectedSeason}
          onChange={handleSeasonChange}
          disabled={loading}
        />

        {/* Standings / Results toggle */}
        <div role="tablist" aria-label="View mode" className="flex overflow-hidden rounded-lg border border-white/10">
          <button
            role="tab"
            aria-selected={activeTab === "standings"}
            onClick={() => setActiveTab("standings")}
            className={`cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "standings"
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            Standings
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "results"}
            onClick={() => setActiveTab("results")}
            className={`cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "results"
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            Results
          </button>
        </div>

        {loading && (
          <span className="text-sm text-white/40">Loading...</span>
        )}
      </div>

      {/* Error state */}
      {fetchError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-sm text-red-400">{fetchError}</p>
          <button
            onClick={() => handleSeasonChange(selectedSeason)}
            className="mt-2 cursor-pointer text-sm font-medium text-white/60 underline hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      {!fetchError && activeTab === "standings" && (
        <StandingsView
          season={data.season}
          driverStandings={data.driverStandings}
          constructorStandings={data.constructorStandings}
          driverHeadshots={data.driverHeadshots}
        />
      )}

      {!fetchError && activeTab === "results" && (
        <RaceResultsView races={data.races} season={data.season} driverHeadshots={data.driverHeadshots} />
      )}
    </div>
  );
}
