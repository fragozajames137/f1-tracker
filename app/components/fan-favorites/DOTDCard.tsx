import Link from "next/link";
import type { DOTDRace } from "@/app/types/dotd";
import { nationalityToFlag } from "@/app/lib/flags";
import gridData from "@/app/data/grid-2026.json";
import type { GridData } from "@/app/types";

const grid = gridData as GridData;

function getDriverInfo(driverId: string) {
  for (const team of grid.teams) {
    for (const seat of [team.seat1, team.seat2]) {
      if (seat.id === driverId) {
        return { nationality: seat.nationality, teamName: team.name, teamColor: team.color };
      }
    }
  }
  return null;
}

export default function DOTDCard({ race }: { race: DOTDRace }) {
  const info = getDriverInfo(race.winnerId);
  const flag = info ? nationalityToFlag(info.nationality) : "";

  return (
    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-yellow-400/70">
            Driver of the Day
          </p>
          <div className="mt-1 flex items-center gap-2">
            {flag && <span className="text-lg">{flag}</span>}
            <span className="text-lg font-bold text-white">{race.winnerName}</span>
            {info && (
              <>
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: info.teamColor }}
                />
                <span className="text-sm text-white/50">{info.teamName}</span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-white/30">
            {race.topFive[0]?.percentage}% of the vote
            {race.topFive.length >= 2 && (
              <span>
                {" "}
                &middot; Runner-up: {race.topFive[1].driverName} ({race.topFive[1].percentage}%)
              </span>
            )}
          </p>
        </div>
        <Link
          href="/fan-favorites"
          className="shrink-0 rounded-md bg-white/5 px-3 py-1.5 text-xs text-white/50 hover:bg-white/10 hover:text-white/70 transition-colors"
        >
          View all
        </Link>
      </div>
    </div>
  );
}
