"use client";

import type { F1HistoricalDriver } from "@/app/types/f1-reference";

interface CareerTabProps {
  historicalDriver: F1HistoricalDriver;
  teamColor: string;
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/40">{label}</p>
    </div>
  );
}

export default function CareerTab({ historicalDriver: d, teamColor }: CareerTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
          All-Time Career Stats
        </h3>
        <p className="mb-4 text-sm text-white/50">
          {d.nationality} &middot; Seasons: {d.seasons}
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          <StatBox label="Championships" value={d.championships} />
          <StatBox label="Wins" value={d.wins} />
          <StatBox label="Poles" value={d.poles} />
          <StatBox label="Podiums" value={d.podiums} />
          <StatBox label="Fastest Laps" value={d.fastestLaps} />
          <StatBox label="Points" value={d.points} />
          <StatBox label="Entries" value={d.entries} />
          <StatBox label="Starts" value={d.starts} />
        </div>
      </div>

      {d.championships > 0 && (
        <div
          className="rounded-lg border px-4 py-3"
          style={{ borderColor: `${teamColor}40`, backgroundColor: `${teamColor}08` }}
        >
          <p className="text-sm text-white/70">
            <span className="font-bold text-white">{d.championships}x</span> World
            Drivers&apos; Champion
          </p>
        </div>
      )}
    </div>
  );
}
