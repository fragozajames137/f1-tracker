"use client";

import { useEffect, useState } from "react";

interface SeasonStat {
  year: number;
  races: number;
  wins: number;
  podiums: number;
  points: number;
  bestFinish: number;
  dnfs: number;
}

interface SeasonSummaryTabProps {
  driverId: string;
  teamColor: string;
}

export default function SeasonSummaryTab({ driverId, teamColor }: SeasonSummaryTabProps) {
  const [stats, setStats] = useState<SeasonStat[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    fetch(`/api/driver/${driverId}/stats`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => setStats([]))
      .finally(() => { clearTimeout(timeout); setLoading(false); });
    return () => { controller.abort(); clearTimeout(timeout); };
  }, [driverId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-white/5" />
        ))}
      </div>
    );
  }

  if (!stats?.length) {
    return <p className="text-sm text-white/30 italic">No season data available yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs text-white/40 uppercase tracking-wider">
            <th className="pb-2 pr-4">Year</th>
            <th className="pb-2 pr-4 text-right">Races</th>
            <th className="pb-2 pr-4 text-right">Wins</th>
            <th className="pb-2 pr-4 text-right">Podiums</th>
            <th className="pb-2 pr-4 text-right">Points</th>
            <th className="pb-2 pr-4 text-right">Best</th>
            <th className="pb-2 text-right">DNFs</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.year} className="border-b border-white/5 hover:bg-white/5">
              <td className="py-2 pr-4 font-mono font-semibold" style={{ color: teamColor }}>
                {s.year}
              </td>
              <td className="py-2 pr-4 text-right text-white/60">{s.races}</td>
              <td className="py-2 pr-4 text-right text-white/80 font-medium">{s.wins}</td>
              <td className="py-2 pr-4 text-right text-white/60">{s.podiums}</td>
              <td className="py-2 pr-4 text-right text-white/80 font-medium">{s.points}</td>
              <td className="py-2 pr-4 text-right text-white/60">
                P{s.bestFinish}
              </td>
              <td className="py-2 text-right text-white/40">{s.dnfs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
