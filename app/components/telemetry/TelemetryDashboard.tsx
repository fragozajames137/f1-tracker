"use client";

import { useState, useRef, useMemo } from "react";
import type { TelemetrySession, TelemetryFileInfo } from "@/app/types/telemetry";
import { usePreferencesStore } from "@/app/stores/preferences";
import TrackMap from "./TrackMap";
import SpeedTrace from "./SpeedTrace";
import LapTimeChart from "./LapTimeChart";
import TireStrategyChart from "./TireStrategyChart";
import LazyChart from "./LazyChart";

interface TelemetryDashboardProps {
  files: TelemetryFileInfo[];
  initialSession: TelemetrySession | null;
}

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function getTop3Drivers(session: TelemetrySession, favoriteIds?: string[]): number[] {
  const sorted = session.drivers
    .filter((d) => d.position !== null)
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99));

  // Start with favorites that are in this session
  const result: number[] = [];
  if (favoriteIds) {
    for (const favId of favoriteIds) {
      const match = sorted.find((d) => nameToSlug(d.fullName) === favId);
      if (match && !result.includes(match.number)) result.push(match.number);
    }
  }
  // Fill remaining with top drivers
  for (const d of sorted) {
    if (result.length >= 3) break;
    if (!result.includes(d.number)) result.push(d.number);
  }
  return result;
}

function formatSlug(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TelemetryDashboard({
  files,
  initialSession,
}: TelemetryDashboardProps) {
  const favoriteDriverIds = usePreferencesStore((s) => s.favoriteDriverIds);
  const [session, setSession] = useState<TelemetrySession | null>(initialSession);
  const [selectedFile, setSelectedFile] = useState<string>(
    files[0]?.filename ?? "",
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    files[0]?.year ?? 2025,
  );
  const [loadingSession, setLoadingSession] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedDriverNumbers, setSelectedDriverNumbers] = useState<number[]>(
    () => (initialSession ? getTop3Drivers(initialSession, favoriteDriverIds) : []),
  );
  const speedUnit = usePreferencesStore((s) => s.speedUnit);

  const years = useMemo(
    () => [...new Set(files.map((f) => f.year))].sort((a, b) => b - a),
    [files],
  );
  const racesForYear = useMemo(
    () => files.filter((f) => f.year === selectedYear),
    [files, selectedYear],
  );

  // Client-side cache to avoid re-fetching the same file
  const cacheRef = useRef(new Map<string, TelemetrySession>());
  if (initialSession && files[0] && !cacheRef.current.has(files[0].filename)) {
    cacheRef.current.set(files[0].filename, initialSession);
  }

  const handleFileChange = async (filename: string) => {
    setSelectedFile(filename);

    // Return cached data immediately if available
    const cached = cacheRef.current.get(filename);
    if (cached) {
      setSession(cached);
      setSelectedDriverNumbers(getTop3Drivers(cached, favoriteDriverIds));
      return;
    }

    setLoadingSession(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/telemetry?file=${encodeURIComponent(filename)}`);
      if (!res.ok) {
        setFetchError(
          res.status === 404
            ? "Session data not found."
            : `Failed to load session (${res.status}).`,
        );
        return;
      }
      const data: TelemetrySession = await res.json();
      cacheRef.current.set(filename, data);
      setSession(data);
      setSelectedDriverNumbers(getTop3Drivers(data, favoriteDriverIds));
    } catch {
      setFetchError("Network error. Please check your connection and try again.");
    } finally {
      setLoadingSession(false);
    }
  };

  const toggleDriver = (driverNumber: number) => {
    setSelectedDriverNumbers((prev) =>
      prev.includes(driverNumber)
        ? prev.filter((n) => n !== driverNumber)
        : [...prev, driverNumber],
    );
  };

  if (files.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-lg font-medium text-white/60">
          No telemetry data yet
        </p>
        <p className="mt-2 text-sm text-white/30">
          Run the FastF1 script to generate data:
        </p>
        <code className="mt-3 inline-block rounded bg-white/5 px-3 py-2 text-sm text-white/60">
          python scripts/fetch_telemetry.py --year 2025 --round 1
        </code>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <select
          value={selectedYear}
          onChange={(e) => {
            const year = Number(e.target.value);
            setSelectedYear(year);
            const firstForYear = files.find((f) => f.year === year);
            if (firstForYear) handleFileChange(firstForYear.filename);
          }}
          className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 sm:w-auto"
        >
          {years.map((y) => (
            <option key={y} value={y} className="bg-[#111]">
              {y}
            </option>
          ))}
        </select>

        <select
          value={selectedFile}
          onChange={(e) => handleFileChange(e.target.value)}
          className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 sm:w-auto"
        >
          {racesForYear.map((f) => (
            <option key={f.filename} value={f.filename} className="bg-[#111]">
              R{f.round} — {formatSlug(f.slug)}
            </option>
          ))}
        </select>

        {loadingSession && (
          <span className="text-sm text-white/40">Loading...</span>
        )}
      </div>

      {fetchError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-sm text-red-400">{fetchError}</p>
          <button
            onClick={() => handleFileChange(selectedFile)}
            className="mt-2 cursor-pointer text-sm font-medium text-white/60 underline hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      {session && !fetchError && (
        <>
          <div className="text-sm text-white/40">
            {session.eventName} — {session.circuitName}, {session.country}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Compare Drivers
              </h3>
              {selectedDriverNumbers.length > 0 ? (
                <button
                  onClick={() => setSelectedDriverNumbers([])}
                  className="cursor-pointer text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  Deselect All
                </button>
              ) : (
                <button
                  onClick={() => setSelectedDriverNumbers(getTop3Drivers(session))}
                  className="cursor-pointer text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  Select Top 3
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {session.drivers
                .filter((d) => d.position !== null)
                .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
                .map((driver) => {
                  const isSelected = selectedDriverNumbers.includes(
                    driver.number,
                  );
                  return (
                    <button
                      key={driver.number}
                      onClick={() => toggleDriver(driver.number)}
                      className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        isSelected
                          ? "border-white/30 bg-white/10 text-white"
                          : "border-white/10 bg-white/5 text-white/40 hover:text-white/70"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {driver.teamColor && (
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: driver.teamColor }}
                          />
                        )}
                        {driver.abbreviation}
                        <span className="text-xs text-white/30">
                          P{driver.position}
                        </span>
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>

          <TrackMap
            traces={session.telemetryData.filter((t) =>
              selectedDriverNumbers.includes(t.driverNumber),
            )}
            drivers={session.drivers}
            trackBoundary={session.trackBoundary}
            drsZones={session.drsZones}
            speedUnit={speedUnit}
          />

          <LazyChart key={`speed-${selectedFile}`} title="Speed Trace — Fastest Laps">
            <SpeedTrace
              traces={session.telemetryData.filter((t) =>
                selectedDriverNumbers.includes(t.driverNumber),
              )}
              drivers={session.drivers}
              speedUnit={speedUnit}
              drsZones={session.drsZones}
            />
          </LazyChart>

          <LazyChart key={`laps-${selectedFile}`} title="Lap Times">
            <LapTimeChart
              laps={session.lapData}
              drivers={session.drivers}
              selectedDriverNumbers={selectedDriverNumbers}
            />
          </LazyChart>

          <LazyChart key={`strat-${selectedFile}`} title="Tire Strategy">
            <TireStrategyChart
              stints={session.stintData}
              drivers={session.drivers}
            />
          </LazyChart>
        </>
      )}
    </div>
  );
}
