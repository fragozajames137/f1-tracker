"use client";

import { useRouter } from "next/navigation";
import type { Race } from "@/app/types";

interface RaceSelectorProps {
  races: Race[];
  currentRound: number;
}

export default function RaceSelector({ races, currentRound }: RaceSelectorProps) {
  const router = useRouter();

  return (
    <select
      value={currentRound}
      onChange={(e) => {
        const round = e.target.value;
        router.push(`/race?round=${round}`);
      }}
      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors hover:border-white/20 focus:border-white/30"
    >
      {races.map((race) => (
        <option key={race.round} value={race.round} className="bg-neutral-900">
          R{race.round} — {race.raceName}
        </option>
      ))}
    </select>
  );
}
