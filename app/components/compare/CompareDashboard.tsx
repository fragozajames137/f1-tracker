"use client";

import { useState, useMemo, useRef } from "react";
import type { TelemetrySession, TelemetryFileInfo } from "@/app/types/telemetry";
import { computeComparison } from "@/app/lib/compare";
import { usePreferencesStore } from "@/app/stores/preferences";
import StatBars from "./StatBars";
import DrivingDNA from "./DrivingDNA";
import LapTimeOverlay from "./LapTimeOverlay";
import TraceOverlay from "./TraceOverlay";
import GapDelta from "./GapDelta";
import SectorDelta from "./SectorDelta";
import DriverRadar from "./DriverRadar";
import StrategyComparison from "./StrategyComparison";

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

interface CompareDashboardProps {
  files: TelemetryFileInfo[];
  initialSession: TelemetrySession | null;
}

function getDefaultDrivers(
  session: TelemetrySession,
  favoriteIds?: string[],
): [number, number] {
  const sorted = session.drivers
    .filter((d) => d.position !== null)
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99));

  // Try to match favorites to session drivers
  if (favoriteIds && favoriteIds.length > 0) {
    const favNumbers: number[] = [];
    for (const favId of favoriteIds) {
      const match = sorted.find((d) => nameToSlug(d.fullName) === favId);
      if (match) favNumbers.push(match.number);
    }
    if (favNumbers.length >= 2) return [favNumbers[0], favNumbers[1]];
    if (favNumbers.length === 1) {
      const otherDriver = sorted.find((d) => d.number !== favNumbers[0]);
      return [favNumbers[0], otherDriver?.number ?? sorted[1]?.number ?? 0];
    }
  }

  return [sorted[0]?.number ?? 0, sorted[1]?.number ?? 0];
}

function formatSlug(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CompareDashboard({
  files,
  initialSession,
}: CompareDashboardProps) {
  const favoriteDriverIds = usePreferencesStore((s) => s.favoriteDriverIds);
  const [session, setSession] = useState<TelemetrySession | null>(
    initialSession,
  );
  const [selectedFile, setSelectedFile] = useState<string>(
    files[0]?.filename ?? "",
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    files[0]?.year ?? 2025,
  );
  const [loadingSession, setLoadingSession] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [driverA, setDriverA] = useState<number>(() =>
    initialSession ? getDefaultDrivers(initialSession, favoriteDriverIds)[0] : 0,
  );
  const [driverB, setDriverB] = useState<number>(() =>
    initialSession ? getDefaultDrivers(initialSession, favoriteDriverIds)[1] : 0,
  );

  const cacheRef = useRef(new Map<string, TelemetrySession>());
  if (initialSession && files[0] && !cacheRef.current.has(files[0].filename)) {
    cacheRef.current.set(files[0].filename, initialSession);
  }

  const years = useMemo(
    () => [...new Set(files.map((f) => f.year))].sort((a, b) => b - a),
    [files],
  );
  const racesForYear = useMemo(
    () => files.filter((f) => f.year === selectedYear),
    [files, selectedYear],
  );

  const comparison = useMemo(() => {
    if (!session || !driverA || !driverB || driverA === driverB) return null;
    return computeComparison(session, driverA, driverB);
  }, [session, driverA, driverB]);

  const handleFileChange = async (filename: string) => {
    setSelectedFile(filename);

    const cached = cacheRef.current.get(filename);
    if (cached) {
      setSession(cached);
      const [a, b] = getDefaultDrivers(cached, favoriteDriverIds);
      setDriverA(a);
      setDriverB(b);
      return;
    }

    setLoadingSession(true);
    setFetchError(null);
    try {
      const res = await fetch(
        `/api/telemetry?file=${encodeURIComponent(filename)}`,
      );
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
      const [a, b] = getDefaultDrivers(data, favoriteDriverIds);
      setDriverA(a);
      setDriverB(b);
    } catch {
      setFetchError(
        "Network error. Please check your connection and try again.",
      );
    } finally {
      setLoadingSession(false);
    }
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

  const sortedDrivers = session
    ? [...session.drivers]
        .filter((d) => d.position !== null)
        .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
    : [];

  return (
    <div className="space-y-6">
      {/* Race selector */}
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

          {/* Driver pickers */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Driver A */}
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Driver A
              </label>
              <select
                value={driverA}
                onChange={(e) => setDriverA(Number(e.target.value))}
                className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
              >
                {sortedDrivers.map((d) => (
                  <option
                    key={d.number}
                    value={d.number}
                    className="bg-[#111]"
                    disabled={d.number === driverB}
                  >
                    P{d.position} — {d.abbreviation} ({d.teamName})
                  </option>
                ))}
              </select>
            </div>

            {/* Driver B */}
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Driver B
              </label>
              <select
                value={driverB}
                onChange={(e) => setDriverB(Number(e.target.value))}
                className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
              >
                {sortedDrivers.map((d) => (
                  <option
                    key={d.number}
                    value={d.number}
                    className="bg-[#111]"
                    disabled={d.number === driverA}
                  >
                    P{d.position} — {d.abbreviation} ({d.teamName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Team color dots for selected drivers */}
          <div className="flex items-center justify-center gap-8">
            {[
              sortedDrivers.find((d) => d.number === driverA),
              sortedDrivers.find((d) => d.number === driverB),
            ]
              .filter(Boolean)
              .map((d) => (
                <span
                  key={d!.number}
                  className="flex items-center gap-2 text-sm font-medium text-white/70"
                >
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: d!.teamColor ?? "#666" }}
                  />
                  {d!.fullName}
                </span>
              ))}
          </div>

          {driverA === driverB && (
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-center">
              <p className="text-sm text-yellow-400">
                Select two different drivers to compare
              </p>
            </div>
          )}

          {comparison && (
            <>
              <StatBars
                driverA={comparison.driverA}
                driverB={comparison.driverB}
              />

              <DrivingDNA data={comparison.drivingDNA} />

              <LapTimeOverlay
                data={comparison.lapOverlayData}
                driverA={comparison.driverA}
                driverB={comparison.driverB}
              />

              <TraceOverlay
                data={comparison.traceOverlayData}
                driverA={comparison.driverA}
                driverB={comparison.driverB}
              />

              <GapDelta
                data={comparison.gapDeltaData}
                driverA={comparison.driverA}
                driverB={comparison.driverB}
              />

              <SectorDelta
                sectorDelta={comparison.sectorDelta}
                driverA={comparison.driverA}
                driverB={comparison.driverB}
                sectorTableData={comparison.sectorTableData}
              />

              <DriverRadar
                data={comparison.radarData}
                driverA={comparison.driverA}
                driverB={comparison.driverB}
              />

              <StrategyComparison
                driverA={comparison.driverA}
                driverB={comparison.driverB}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
