"use client";

import { useMemo } from "react";
import type { Race } from "@/app/types";
import SectionNav from "./SectionNav";
import ResultsTable from "./ResultsTable";
import PositionChart from "./PositionChart";
import StrategyChart from "./StrategyChart";
import TrackDominance from "./TrackDominance";
import LapChart from "../history/LapChart";
import RaceControlFeed from "../history/RaceControlFeed";
import WeatherChart from "../history/WeatherChart";
import PitStopTable from "../history/PitStopTable";
import DOTDCard from "../fan-favorites/DOTDCard";
import { getDOTDByRound } from "@/app/lib/dotd";

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

interface PostRaceTabProps {
  sessions: SessionInfo[];
  raceSessionKey: number | null;
  year: number;
  round: number;
  race: Race | null;
}

const SECTIONS = [
  { id: "results", label: "Results" },
  { id: "dotd", label: "DOTD" },
  { id: "positions", label: "Positions" },
  { id: "strategy", label: "Strategy" },
  { id: "track-dominance", label: "Track" },
  { id: "laps", label: "Laps" },
  { id: "control", label: "Control" },
  { id: "weather", label: "Weather" },
  { id: "pits", label: "Pits" },
];

export default function PostRaceTab({ sessions, raceSessionKey, year, round, race }: PostRaceTabProps) {
  const dotdRace = getDOTDByRound(round);

  // Find the race session key — prefer explicit prop, fallback to finding it
  const sessionKey = useMemo(() => {
    if (raceSessionKey) return raceSessionKey;
    const raceSession = sessions.find(
      (s) => s.sessionType === "Race" && s.ingestedAt,
    );
    return raceSession?.sessionKey ?? null;
  }, [raceSessionKey, sessions]);

  if (!sessionKey) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-lg font-medium text-white/60">
          Post-race analysis not yet available
        </p>
        <p className="mt-2 text-sm text-white/30">
          Race data for{" "}
          {race?.raceName ?? `Round ${round}, ${year}`} has not been ingested yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <SectionNav sections={SECTIONS} />

      <div className="space-y-8">
        <section id="results" className="scroll-mt-16">
          <ResultsTable sessionKey={sessionKey} />
        </section>

        {dotdRace && (
          <section id="dotd" className="scroll-mt-16">
            <DOTDCard race={dotdRace} />
          </section>
        )}

        <section id="positions" className="scroll-mt-16">
          <PositionChart sessionKey={sessionKey} />
        </section>

        <section id="strategy" className="scroll-mt-16">
          <StrategyChart sessionKey={sessionKey} />
        </section>

        <section id="track-dominance" className="scroll-mt-16">
          <TrackDominance year={year} round={round} raceName={race?.raceName} />
        </section>

        <section id="laps" className="scroll-mt-16">
          <LapChart sessionKey={sessionKey} />
        </section>

        <section id="control" className="scroll-mt-16">
          <RaceControlFeed sessionKey={sessionKey} />
        </section>

        <section id="weather" className="scroll-mt-16">
          <WeatherChart sessionKey={sessionKey} />
        </section>

        <section id="pits" className="scroll-mt-16">
          <PitStopTable sessionKey={sessionKey} />
        </section>
      </div>
    </div>
  );
}
