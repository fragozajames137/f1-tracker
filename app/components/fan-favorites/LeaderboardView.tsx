"use client";

import type { DOTDDriverStats, DOTDHighlights } from "@/app/types/dotd";
import { nationalityToFlag } from "@/app/lib/flags";

function HighlightCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
      <p className="mt-0.5 text-xs text-white/40">{detail}</p>
    </div>
  );
}

function DriverCard({
  driver,
  rank,
}: {
  driver: DOTDDriverStats;
  rank: number;
}) {
  const flag = nationalityToFlag(driver.nationality);
  const isTop3 = rank <= 3;

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        isTop3
          ? "border-yellow-500/20 bg-yellow-500/[0.04]"
          : "border-white/5 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            rank === 1
              ? "bg-yellow-500/20 text-yellow-400"
              : rank === 2
                ? "bg-gray-300/15 text-gray-300"
                : rank === 3
                  ? "bg-orange-500/15 text-orange-400"
                  : "bg-white/5 text-white/30"
          }`}
        >
          {rank}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {flag && <span className="text-sm">{flag}</span>}
            <span className="font-semibold text-white">{driver.driverName}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: driver.teamColor }}
            />
            <span className="text-xs text-white/40">{driver.teamName}</span>
          </div>
          {driver.wins > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {driver.races
                .filter((r) => r.won)
                .map((r) => (
                  <span
                    key={r.round}
                    className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/50"
                  >
                    R{r.round} {r.raceName.replace(" Grand Prix", "")}
                  </span>
                ))}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold tabular-nums text-white">{driver.wins}</p>
          <p className="text-[10px] text-white/30">
            win{driver.wins !== 1 ? "s" : ""}
          </p>
          <p className="mt-1 text-xs text-white/30">
            {driver.topFives} top-5{driver.topFives !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardView({
  leaderboard,
  highlights,
}: {
  leaderboard: DOTDDriverStats[];
  highlights: DOTDHighlights;
}) {
  // Only show drivers with at least 1 win in the main list
  const winners = leaderboard.filter((d) => d.wins > 0);
  const nonWinners = leaderboard.filter((d) => d.wins === 0);

  return (
    <div className="space-y-8">
      {/* Highlight Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <HighlightCard
          label="Biggest Landslide"
          value={`${highlights.biggestLandslide.percentage}%`}
          detail={`${highlights.biggestLandslide.driverName} — ${highlights.biggestLandslide.raceName.replace(" Grand Prix", "")}`}
        />
        <HighlightCard
          label="Closest Vote"
          value={`${highlights.closestVote.margin}% margin`}
          detail={`${highlights.closestVote.winnerName} beat ${highlights.closestVote.runnerUpName} — ${highlights.closestVote.raceName.replace(" Grand Prix", "")}`}
        />
        <HighlightCard
          label="Most Popular"
          value={`${highlights.mostTopFives.count} top-5s`}
          detail={`${highlights.mostTopFives.driverName} (${highlights.mostTopFives.wins} win${highlights.mostTopFives.wins !== 1 ? "s" : ""})`}
        />
      </div>

      {/* Winners Leaderboard */}
      <div>
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
          DOTD Winners — 2025 Season
        </h3>
        <div className="space-y-2">
          {winners.map((driver, i) => (
            <DriverCard key={driver.driverId} driver={driver} rank={i + 1} />
          ))}
        </div>
      </div>

      {/* Non-winners who appeared in top 5 */}
      {nonWinners.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
            Also in the Top 5
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                    Driver
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-white/40">
                    Top-5 Appearances
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-white/40">
                    Avg Vote %
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                    Best Result
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {nonWinners.map((driver) => {
                  const flag = nationalityToFlag(driver.nationality);
                  const best = driver.races.reduce((a, b) =>
                    a.percentage > b.percentage ? a : b,
                  );
                  return (
                    <tr key={driver.driverId}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {flag && <span className="text-sm">{flag}</span>}
                          <span className="text-white/70">{driver.driverName}</span>
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: driver.teamColor }}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-white/50">
                        {driver.topFives}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-white/50">
                        {driver.avgPercentage}%
                      </td>
                      <td className="px-3 py-2.5 text-xs text-white/40">
                        {best.percentage}% at {best.raceName.replace(" Grand Prix", "")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
