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

import dynamic from "next/dynamic";
import PositionTable from "../live/PositionTable";
import LapTimesPanel from "../live/LapTimesPanel";
import PitStopsPanel from "../live/PitStopsPanel";
import RaceControlFeed from "../live/RaceControlFeed";
import TeamRadioFeed from "../live/TeamRadioFeed";
import SpeedTrapPanel from "../live/SpeedTrapPanel";
import WeatherBar from "../live/WeatherBar";
import TrackLimitsPanel from "../live/TrackLimitsPanel";
import ChampionshipImpact from "../live/ChampionshipImpact";

const RainRadar = dynamic(() => import("../live/RainRadar"), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] animate-pulse rounded-lg bg-white/5" />
  ),
});

interface SessionInfo {
  sessionKey: number;
  sessionType: string;
  sessionName: string;
  startDate: string | null;
  endDate: string | null;
  gmtOffset: string | null;
  totalLaps: number | null;
  ingestedAt: string | null;
  meetingKey: number;
  meetingName: string;
  round: number;
  location: string | null;
  country: string | null;
  circuit: string | null;
}

interface LiveTabProps {
  sessions: SessionInfo[];
  year: number;
  round: number;
}

export default function LiveTab({ year, round }: LiveTabProps) {
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
  const selectedDriverNumber = useLiveSessionStore((s) => s.selectedDriverNumber);
  const driverLaps = useLiveSessionStore((s) => s.driverLaps);
  const setSelectedDriverNumber = useLiveSessionStore((s) => s.setSelectedDriverNumber);

  useLivePolling();

  const driversWithDetails = useMemo((): DriverWithDetails[] => {
    const latestPosition = new Map<number, OpenF1Position>();
    for (const p of positions) latestPosition.set(p.driver_number, p);

    const latestInterval = new Map<number, OpenF1Interval>();
    for (const i of intervals) latestInterval.set(i.driver_number, i);

    const latestLap = new Map<number, OpenF1Lap>();
    for (const l of laps) latestLap.set(l.driver_number, l);

    const latestStint = new Map<number, OpenF1Stint>();
    for (const s of stints) latestStint.set(s.driver_number, s);

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

  const latestWeather = weather.length > 0 ? weather[weather.length - 1] : null;
  const selectedSession = sessions.find((s) => s.session_key === selectedSessionKey) ?? null;
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
        <div className="text-sm text-white/40">Loading live session...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <p className="text-lg font-medium text-white/60">
          Live data unavailable
        </p>
        <p className="mt-2 max-w-md text-sm text-white/30">
          {error.includes("401")
            ? "The OpenF1 API requires authentication. Live data will be available once API access is configured."
            : error}
        </p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-lg font-medium text-white/60">
          No live sessions available
        </p>
        <p className="mt-2 text-sm text-white/30">
          Live data will appear here during a session for Round {round}, {year}.
        </p>
      </div>
    );
  }

  // Session sub-selector for this race weekend
  const weekendSessions = sessions.filter((s) => {
    const name = s.session_name?.toLowerCase() ?? "";
    return name.includes("practice") || name.includes("qualifying") || name.includes("race") || name.includes("sprint");
  });

  return (
    <div className="space-y-6">
      {/* Session sub-selector */}
      {weekendSessions.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {weekendSessions.map((s) => (
            <button
              key={s.session_key}
              onClick={() => useLiveSessionStore.getState().setSelectedSessionKey(s.session_key)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedSessionKey === s.session_key
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {s.session_name}
            </button>
          ))}
        </div>
      )}

      <WeatherBar weather={latestWeather} />

      {circuitShortName && <RainRadar circuitShortName={circuitShortName} />}

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
          <PitStopsPanel pitStops={pitStops} stints={stints} drivers={drivers} />
          <RaceControlFeed messages={raceControl} />
          <TeamRadioFeed messages={teamRadio} drivers={drivers} />
        </div>
      </div>

      {isRaceOrSprint && selectedSession && (
        <ChampionshipImpact
          drivers={drivers}
          positions={positions}
          sessionType={selectedSession.session_type}
          year={selectedSession.year}
        />
      )}
    </div>
  );
}
