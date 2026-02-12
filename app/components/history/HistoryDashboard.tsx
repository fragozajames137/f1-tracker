"use client";

import { useState, useRef, useCallback } from "react";
import type { HistoryData } from "@/app/types/history";
import type {
  DriverStandingsResponse,
  ConstructorStandingsResponse,
  RaceResultsResponse,
} from "@/app/types/history";
import SeasonSelector from "./SeasonSelector";
import StandingsView from "./StandingsView";
import RaceResultsView from "./RaceResultsView";

type Tab = "standings" | "results";

const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";

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
      const [driversRes, constructorsRes, resultsRes] = await Promise.all([
        fetch(`${JOLPICA_BASE}/${year}/driverstandings.json`),
        fetch(`${JOLPICA_BASE}/${year}/constructorstandings.json`),
        fetch(`${JOLPICA_BASE}/${year}/results.json?limit=1000`),
      ]);

      const driversData: DriverStandingsResponse = driversRes.ok
        ? await driversRes.json()
        : { MRData: { StandingsTable: { StandingsLists: [] } } };

      const constructorsData: ConstructorStandingsResponse = constructorsRes.ok
        ? await constructorsRes.json()
        : { MRData: { StandingsTable: { StandingsLists: [] } } };

      const resultsData: RaceResultsResponse = resultsRes.ok
        ? await resultsRes.json()
        : { MRData: { RaceTable: { Races: [] } } };

      const driverLists = driversData.MRData.StandingsTable.StandingsLists;
      const constructorLists =
        constructorsData.MRData.StandingsTable.StandingsLists;

      const historyData: HistoryData = {
        season: year,
        driverStandings:
          driverLists.length > 0 ? driverLists[0].DriverStandings : [],
        constructorStandings:
          constructorLists.length > 0
            ? constructorLists[0].ConstructorStandings
            : [],
        races: resultsData.MRData.RaceTable.Races,
      };

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
        <div className="flex overflow-hidden rounded-lg border border-white/10">
          <button
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
        />
      )}

      {!fetchError && activeTab === "results" && (
        <RaceResultsView races={data.races} />
      )}
    </div>
  );
}
