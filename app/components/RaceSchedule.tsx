"use client";

import { Race } from "@/app/types";
import { generateICS, downloadICS } from "@/app/lib/ics";
import RaceCard from "./RaceCard";
import type { RaceEnrichment } from "./RaceCard";

interface RaceScheduleProps {
  races: Race[];
  enrichments?: Record<string, RaceEnrichment>;
}

function getNextRaceIndex(races: Race[]): number {
  const now = new Date();
  return races.findIndex((race) => {
    const raceDate = new Date(`${race.date}T${race.time}`);
    return raceDate > now;
  });
}

function groupByMonth(races: Race[]): Map<string, Race[]> {
  const groups = new Map<string, Race[]>();
  for (const race of races) {
    const d = new Date(`${race.date}T00:00:00Z`);
    const key = new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(d);
    const existing = groups.get(key) ?? [];
    existing.push(race);
    groups.set(key, existing);
  }
  return groups;
}

export default function RaceSchedule({ races, enrichments }: RaceScheduleProps) {
  const nextRaceIndex = getNextRaceIndex(races);
  const grouped = groupByMonth(races);

  let raceCounter = 0;

  const handleExportAll = () => {
    const season = races[0]?.season ?? "2026";
    const ics = generateICS(races);
    downloadICS(ics, `f1-${season}-calendar.ics`);
  };

  return (
    <div className="space-y-8">
      <button
        onClick={handleExportAll}
        className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        Add All Races to Calendar
      </button>

      {Array.from(grouped.entries()).map(([month, monthRaces]) => (
        <section key={month}>
          <h2 className="font-display mb-3 text-lg font-bold text-white/70">{month}</h2>
          <div className="space-y-3">
            {monthRaces.map((race) => {
              const index = raceCounter++;
              return (
                <RaceCard
                  key={race.round}
                  race={race}
                  isNext={index === nextRaceIndex}
                  enrichment={enrichments?.[race.round]}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
