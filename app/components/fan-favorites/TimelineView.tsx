"use client";

import { useState } from "react";
import type { DOTDRace } from "@/app/types/dotd";
import { nationalityToFlag } from "@/app/lib/flags";
import gridData from "@/app/data/grid-2026.json";
import type { GridData } from "@/app/types";

const grid = gridData as GridData;

function getTeamColor(driverId: string): string {
  for (const team of grid.teams) {
    if (team.seat1.id === driverId || team.seat2.id === driverId) {
      return team.color;
    }
  }
  return "#666666";
}

function getNationality(driverId: string): string {
  for (const team of grid.teams) {
    for (const seat of [team.seat1, team.seat2]) {
      if (seat.id === driverId) return seat.nationality;
    }
  }
  return "";
}

function VoteBar({ percentage, color, isWinner }: { percentage: number; color: string; isWinner: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(percentage * 1.5, 100)}%`,
            backgroundColor: isWinner ? color : `${color}80`,
          }}
        />
      </div>
      <span className="w-12 text-right text-xs font-mono tabular-nums text-white/50">
        {percentage}%
      </span>
    </div>
  );
}

function RaceCard({ race }: { race: DOTDRace }) {
  const [expanded, setExpanded] = useState(false);
  const winnerColor = getTeamColor(race.winnerId);
  const winnerNat = getNationality(race.winnerId);
  const flag = nationalityToFlag(winnerNat);

  return (
    <div
      className="rounded-lg border border-white/5 bg-white/[0.02] overflow-hidden cursor-pointer transition-colors hover:bg-white/[0.03]"
      style={{ borderLeftColor: winnerColor, borderLeftWidth: 3 }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-xs font-mono text-white/20 w-6 shrink-0">R{race.round}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/70">{race.raceName}</p>
          <p className="text-[10px] text-white/25">
            {new Date(race.date + "T00:00:00").toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {flag && <span className="text-sm">{flag}</span>}
          <span className="font-semibold text-white">{race.winnerName}</span>
          <span className="text-xs font-mono text-yellow-400/70">
            {race.topFive[0]?.percentage}%
          </span>
        </div>
        <span className="text-[10px] text-white/15 w-3">
          {expanded ? "\u25BC" : "\u25B6"}
        </span>
      </div>

      {expanded && (
        <div className="border-t border-white/5 px-4 py-3 space-y-2">
          {race.topFive.map((candidate, i) => {
            const color = getTeamColor(candidate.driverId);
            const nat = getNationality(candidate.driverId);
            const candidateFlag = nationalityToFlag(nat);
            const isWinner = candidate.driverId === race.winnerId;

            return (
              <div key={candidate.driverId} className="flex items-center gap-3">
                <span className="w-4 text-right text-xs text-white/20 font-mono">{i + 1}</span>
                <div className="w-28 shrink-0 flex items-center gap-1.5">
                  {candidateFlag && <span className="text-xs">{candidateFlag}</span>}
                  <span className={`text-xs ${isWinner ? "font-semibold text-white" : "text-white/50"}`}>
                    {candidate.driverName}
                  </span>
                </div>
                <div className="flex-1">
                  <VoteBar
                    percentage={candidate.percentage}
                    color={color}
                    isWinner={isWinner}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TimelineView({ races }: { races: DOTDRace[] }) {
  return (
    <div className="space-y-2">
      {races.map((race) => (
        <RaceCard key={race.round} race={race} />
      ))}
    </div>
  );
}
