"use client";

import { useMemo } from "react";
import type {
  OpenF1Position,
  OpenF1Interval,
  OpenF1Lap,
  OpenF1Stint,
  DriverWithDetails,
} from "@/app/types/openf1";
import { useLiveSessionStore } from "@/app/stores/liveSession";
import { useLivePolling } from "@/app/hooks/useLivePolling";
import { liveProvider } from "@/app/lib/live-timing-provider";

import dynamic from "next/dynamic";
import SessionSelector from "./SessionSelector";
import PositionTable from "./PositionTable";
import LapTimesPanel from "./LapTimesPanel";
import PitStopsPanel from "./PitStopsPanel";
import RaceControlFeed from "./RaceControlFeed";
import TeamRadioFeed from "./TeamRadioFeed";
import SpeedTrapPanel from "./SpeedTrapPanel";
import WeatherBar from "./WeatherBar";
import TrackLimitsPanel from "./TrackLimitsPanel";
import ChampionshipImpact from "./ChampionshipImpact";

const RainRadar = dynamic(() => import("./RainRadar"), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] animate-pulse rounded-lg bg-white/5" />
  ),
});

export default function LiveDashboard() {
  // Connect to store
  const year = useLiveSessionStore((s) => s.year);
  const sessions = useLiveSessionStore((s) => s.sessions);
  const selectedSessionKey = useLiveSessionStore((s) => s.selectedSessionKey);
  const loading = useLiveSessionStore((s) => s.loading);
  const error = useLiveSessionStore((s) => s.error);
  const drivers = useLiveSessionStore((s) => s.drivers);
  const positions = useLiveSessionStore((s) => s.positions);
  const laps = useLiveSessionStore((s) => s.laps);
  const pitStops = useLiveSessionStore((s) => s.pitStops);
  const intervals = useLiveSessionStore((s) => s.intervals);
  const raceControl = useLiveSessionStore((s) => s.raceControl);
  const teamRadio = useLiveSessionStore((s) => s.teamRadio);
  const weather = useLiveSessionStore((s) => s.weather);
  const stints = useLiveSessionStore((s) => s.stints);
  const selectedDriverNumber = useLiveSessionStore(
    (s) => s.selectedDriverNumber,
  );
  const driverLaps = useLiveSessionStore((s) => s.driverLaps);

  const setYear = useLiveSessionStore((s) => s.setYear);
  const setSelectedSessionKey = useLiveSessionStore(
    (s) => s.setSelectedSessionKey,
  );
  const setSelectedDriverNumber = useLiveSessionStore(
    (s) => s.setSelectedDriverNumber,
  );

  // Start polling lifecycle
  useLivePolling();

  // Memoize the combined driver data — single-pass Map lookups instead of
  // nested .filter() to avoid O(drivers × entries) on every polling cycle.
  const driversWithDetails = useMemo((): DriverWithDetails[] => {
    const latestPosition = new Map<number, OpenF1Position>();
    for (const p of positions) {
      latestPosition.set(p.driver_number, p);
    }

    const latestInterval = new Map<number, OpenF1Interval>();
    for (const i of intervals) {
      latestInterval.set(i.driver_number, i);
    }

    const latestLap = new Map<number, OpenF1Lap>();
    for (const l of laps) {
      latestLap.set(l.driver_number, l);
    }

    const latestStint = new Map<number, OpenF1Stint>();
    for (const s of stints) {
      latestStint.set(s.driver_number, s);
    }

    const combined: DriverWithDetails[] = drivers.map((driver) => ({
      driver,
      position: latestPosition.get(driver.driver_number) ?? null,
      interval: latestInterval.get(driver.driver_number) ?? null,
      lastLap: latestLap.get(driver.driver_number) ?? null,
      currentStint: latestStint.get(driver.driver_number) ?? null,
    }));

    combined.sort((a, b) => {
      const posA = a.position?.position ?? 999;
      const posB = b.position?.position ?? 999;
      return posA - posB;
    });

    return combined;
  }, [drivers, positions, intervals, laps, stints]);

  const latestWeather =
    weather.length > 0 ? weather[weather.length - 1] : null;
  const selectedSession =
    sessions.find((s) => s.session_key === selectedSessionKey) ?? null;
  const isRaceOrSprint =
    selectedSession?.session_type === "Race" ||
    selectedSession?.session_type === "Sprint";
  const circuitShortName = selectedSession?.circuit_short_name ?? null;
  const selectedDriver =
    selectedDriverNumber !== null
      ? (drivers.find((d) => d.driver_number === selectedDriverNumber) ?? null)
      : null;

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm text-white/40">Loading sessions...</div>
      </div>
    );
  }

  if (error) {
    const isAuthError = error.includes("401");
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        {isAuthError ? (
          <>
            <p className="text-lg font-medium text-white/60">
              Live data temporarily unavailable
            </p>
            <p className="mt-2 max-w-md text-sm text-white/30">
              The OpenF1 API now requires authentication. Live session data will
              be available once API access is configured.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="/schedule"
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
              >
                View race schedule
              </a>
              <a
                href="/telemetry"
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:border-white/20 hover:text-white"
              >
                View telemetry
              </a>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => {
                useLiveSessionStore.setState({ error: null, loading: true });
                liveProvider.getSessions(year)
                  .then((data) => {
                    const sorted = [...data].sort(
                      (a, b) =>
                        new Date(b.date_start).getTime() -
                        new Date(a.date_start).getTime(),
                    );
                    useLiveSessionStore.setState({
                      sessions: sorted,
                      selectedSessionKey:
                        sorted.length > 0 ? sorted[0].session_key : null,
                      loading: false,
                    });
                  })
                  .catch((err) => {
                    useLiveSessionStore.setState({
                      error: err.message,
                      loading: false,
                    });
                  });
              }}
              className="mt-4 cursor-pointer rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              Try again
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SessionSelector
        year={year}
        sessions={sessions}
        selectedSessionKey={selectedSessionKey}
        onYearChange={setYear}
        onSessionChange={setSelectedSessionKey}
      />

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-lg font-medium text-white/60">
            No sessions yet for {year}
          </p>
          <p className="mt-2 text-sm text-white/30">
            Try selecting a previous year, or check the{" "}
            <a
              href="/schedule"
              className="text-white/60 underline hover:text-white"
            >
              race schedule
            </a>{" "}
            for upcoming events.
          </p>
        </div>
      ) : (
        <>
          <WeatherBar weather={latestWeather} />

          {circuitShortName && (
            <RainRadar circuitShortName={circuitShortName} />
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                  Positions
                </h3>
                <PositionTable
                  drivers={driversWithDetails}
                  selectedDriverNumber={selectedDriverNumber}
                  onSelectDriver={setSelectedDriverNumber}
                />
              </div>
            </div>

            <div className="space-y-6">
              <LapTimesPanel laps={driverLaps} driver={selectedDriver} />
              <SpeedTrapPanel laps={laps} drivers={drivers} />
              <TrackLimitsPanel
                raceControl={raceControl}
                drivers={drivers}
                positions={positions}
                intervals={intervals}
              />
              <PitStopsPanel
                pitStops={pitStops}
                stints={stints}
                drivers={drivers}
              />
              <RaceControlFeed messages={raceControl} />
              <TeamRadioFeed messages={teamRadio} drivers={drivers} />
            </div>
          </div>

          {isRaceOrSprint && selectedSession && (
            <ChampionshipImpact
              drivers={drivers}
              positions={positions}
              sessionType={selectedSession.session_type}
              year={year}
            />
          )}
        </>
      )}
    </div>
  );
}
