"use client";

import { Race } from "@/app/types";
import RaceCard from "./RaceCard";

interface RaceScheduleProps {
  races: Race[];
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

export default function RaceSchedule({ races }: RaceScheduleProps) {
  const nextRaceIndex = getNextRaceIndex(races);
  const grouped = groupByMonth(races);

  let raceCounter = 0;

  return (
    <div className="space-y-8">
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
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
