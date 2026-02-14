"use client";

import { useState, useRef, useCallback } from "react";
import type { Race } from "@/app/types";
import { countryToIso } from "@/app/lib/flags";
import Flag from "../Flag";
import PreSessionTab from "./PreSessionTab";
import LiveTab from "./LiveTab";
import PostRaceTab from "./PostRaceTab";

type RaceState = "pre" | "live" | "post";
type Tab = "pre" | "live" | "post";

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

interface RaceHubProps {
  year: number;
  round: number;
  race: Race | null;
  sessions: SessionInfo[];
  initialState: RaceState;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "pre", label: "Pre-Session" },
  { key: "live", label: "Live" },
  { key: "post", label: "Post-Race" },
];

export default function RaceHub({ year, round, race, sessions, initialState }: RaceHubProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialState);
  const mountedTabs = useRef(new Set<Tab>([initialState]));

  const handleTabChange = useCallback((tab: Tab) => {
    mountedTabs.current.add(tab);
    setActiveTab(tab);
  }, []);

  const isLive = initialState === "live";
  const raceSession = sessions.find((s) => s.sessionType === "Race" && s.ingestedAt);
  const qualiSession = sessions.find(
    (s) => s.sessionType === "Qualifying" && s.ingestedAt,
  );
  const ingestedSessions = sessions.filter((s) => s.ingestedAt);

  return (
    <div>
      {/* Race header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white/30">R{round}</span>
          {race && countryToIso(race.Circuit.Location.country) && (
            <Flag
              iso={countryToIso(race.Circuit.Location.country)!}
              size={20}
              className="shrink-0"
            />
          )}
          <h1 className="font-display text-2xl font-bold text-white">
            {race?.raceName ?? `Round ${round}`}
          </h1>
        </div>
        {race && (
          <p className="mt-1 text-sm text-white/40">
            {race.Circuit.circuitName} &middot; {race.Circuit.Location.locality},{" "}
            {race.Circuit.Location.country}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex rounded-lg border border-white/10 p-1" role="tablist" aria-label="Race Hub sections">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`relative flex-1 cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {tab.label}
            {tab.key === "live" && isLive && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content — lazy-rendered, kept mounted */}
      <div>
        {mountedTabs.current.has("pre") && (
          <div className={activeTab === "pre" ? "" : "hidden"}>
            <PreSessionTab
              race={race}
              sessions={sessions}
              qualiSessionKey={qualiSession?.sessionKey ?? null}
              year={year}
            />
          </div>
        )}

        {mountedTabs.current.has("live") && (
          <div className={activeTab === "live" ? "" : "hidden"}>
            <LiveTab sessions={sessions} year={year} round={round} />
          </div>
        )}

        {mountedTabs.current.has("post") && (
          <div className={activeTab === "post" ? "" : "hidden"}>
            <PostRaceTab
              sessions={ingestedSessions}
              raceSessionKey={raceSession?.sessionKey ?? null}
              year={year}
              round={round}
              race={race}
            />
          </div>
        )}
      </div>
    </div>
  );
}
