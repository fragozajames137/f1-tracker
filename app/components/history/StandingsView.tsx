"use client";

import type { DriverStanding, ConstructorStanding } from "@/app/types/history";
import dominantEngines from "@/app/data/dominant-engines.json";

interface StandingsViewProps {
  season: number;
  driverStandings: DriverStanding[];
  constructorStandings: ConstructorStanding[];
}

export default function StandingsView({
  season,
  driverStandings,
  constructorStandings,
}: StandingsViewProps) {
  const engine = dominantEngines[String(season) as keyof typeof dominantEngines] ?? null;

  if (driverStandings.length === 0 && constructorStandings.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-sm text-white/40">
          No standings data available for this season.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {engine && (
        <div className="flex items-center gap-2 text-sm text-white/40">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Dominant Engine
          </span>
          <span className="rounded bg-white/5 px-2 py-0.5 text-white/70">
            {engine}
          </span>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
      {/* Driver Standings */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
          Driver Standings
        </h3>
        {driverStandings.length === 0 ? (
          <p className="text-sm text-white/30">No driver standings available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/30">
                  <th className="pb-2 pr-3 font-medium">Pos</th>
                  <th className="pb-2 pr-3 font-medium">Driver</th>
                  <th className="hidden pb-2 pr-3 font-medium sm:table-cell">Team</th>
                  <th className="pb-2 pr-3 text-right font-medium">Wins</th>
                  <th className="pb-2 text-right font-medium">Points</th>
                </tr>
              </thead>
              <tbody>
                {driverStandings.map((s) => (
                  <tr
                    key={s.Driver.driverId}
                    className="border-b border-white/5 text-white/70"
                  >
                    <td className="py-2 pr-3 font-mono text-xs text-white/40">
                      {s.position}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="font-medium text-white">
                        {s.Driver.givenName} {s.Driver.familyName}
                      </span>
                      {s.Driver.code && (
                        <span className="ml-1.5 text-xs text-white/30">
                          {s.Driver.code}
                        </span>
                      )}
                    </td>
                    <td className="hidden py-2 pr-3 text-white/40 sm:table-cell">
                      {s.Constructors[0]?.name ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-xs">
                      {s.wins}
                    </td>
                    <td className="py-2 text-right font-mono text-xs font-semibold text-white">
                      {s.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Constructor Standings */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
          Constructor Standings
        </h3>
        {constructorStandings.length === 0 ? (
          <p className="text-sm text-white/30">
            No constructor standings available (pre-1958 seasons).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/30">
                  <th className="pb-2 pr-3 font-medium">Pos</th>
                  <th className="pb-2 pr-3 font-medium">Constructor</th>
                  <th className="hidden pb-2 pr-3 font-medium sm:table-cell">
                    Nationality
                  </th>
                  <th className="pb-2 pr-3 text-right font-medium">Wins</th>
                  <th className="pb-2 text-right font-medium">Points</th>
                </tr>
              </thead>
              <tbody>
                {constructorStandings.map((s) => (
                  <tr
                    key={s.Constructor.constructorId}
                    className="border-b border-white/5 text-white/70"
                  >
                    <td className="py-2 pr-3 font-mono text-xs text-white/40">
                      {s.position}
                    </td>
                    <td className="py-2 pr-3 font-medium text-white">
                      {s.Constructor.name}
                    </td>
                    <td className="hidden py-2 pr-3 text-white/40 sm:table-cell">
                      {s.Constructor.nationality}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-xs">
                      {s.wins}
                    </td>
                    <td className="py-2 text-right font-mono text-xs font-semibold text-white">
                      {s.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
