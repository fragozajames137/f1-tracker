"use client";

import { useState } from "react";
import { Race } from "@/app/types";
import { countryToIso } from "@/app/lib/flags";
import Flag from "./Flag";
import SessionTime from "./SessionTime";

interface RaceCardProps {
  race: Race;
  isNext: boolean;
}

export default function RaceCard({ race, isNext }: RaceCardProps) {
  const [expanded, setExpanded] = useState(isNext);
  const isSprint = !!race.Sprint;

  const sessions: { label: string; date: string; time: string }[] = [];

  if (race.FirstPractice) {
    sessions.push({ label: "FP1", ...race.FirstPractice });
  }
  if (race.SecondPractice) {
    sessions.push({ label: "FP2", ...race.SecondPractice });
  }
  if (race.SprintQualifying) {
    sessions.push({ label: "Sprint Qualifying", ...race.SprintQualifying });
  }
  if (race.ThirdPractice) {
    sessions.push({ label: "FP3", ...race.ThirdPractice });
  }
  if (race.Sprint) {
    sessions.push({ label: "Sprint", ...race.Sprint });
  }
  if (race.Qualifying) {
    sessions.push({ label: "Qualifying", ...race.Qualifying });
  }
  sessions.push({ label: "Race", date: race.date, time: race.time });

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      aria-expanded={expanded}
      aria-label={`Round ${race.round}: ${race.raceName}`}
      className={`w-full cursor-pointer text-left rounded-lg border transition-colors ${
        isNext
          ? "border-red-500/40 bg-red-500/[0.06]"
          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {isNext && (
          <span className="h-full w-1 shrink-0 self-stretch rounded-full bg-red-500" />
        )}
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs font-medium text-white/30">
                R{race.round}
              </span>
              {countryToIso(race.Circuit.Location.country) && (
                <Flag iso={countryToIso(race.Circuit.Location.country)!} size={16} className="shrink-0" />
              )}
              <h3 className="font-display truncate font-semibold text-white">
                {race.raceName}
              </h3>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              {isNext && (
                <span className="shrink-0 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Next
                </span>
              )}
              {isSprint && (
                <span className="shrink-0 rounded bg-purple-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Sprint
                </span>
              )}
              <p className="text-sm text-white/40">
                {race.Circuit.circuitName} &middot;{" "}
                {race.Circuit.Location.locality},{" "}
                {race.Circuit.Location.country}
              </p>
            </div>
          </div>
          <svg
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 text-white/30 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/10 px-4 py-2">
          {sessions.map((s) => (
            <SessionTime
              key={s.label}
              label={s.label}
              date={s.date}
              time={s.time}
            />
          ))}
        </div>
      )}
    </button>
  );
}
