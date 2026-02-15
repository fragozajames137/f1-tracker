"use client";

import { useMemo } from "react";
import type {
  DriverStanding,
  ConstructorStanding,
  RaceWithResults,
} from "@/app/types/history";
import dominantEngines from "@/app/data/dominant-engines.json";
import { usePreferencesStore } from "@/app/stores/preferences";
import { NationalityFlag, DriverImg, TeamLogo } from "./shared";

function nameToSlug(given: string, family: string): string {
  return `${given}-${family}`.toLowerCase().replace(/\s+/g, "-");
}

// ---------------------------------------------------------------------------
// Position change computation
// ---------------------------------------------------------------------------

/** Compute position changes by comparing cumulative standings before and after the last race. */
function computeDriverPositionChanges(
  races: RaceWithResults[],
  currentStandings: DriverStanding[],
): Map<string, number> {
  const changes = new Map<string, number>();
  if (races.length < 2) return changes;

  // Accumulate points from all races except the last
  const pointsBeforeLast = new Map<string, number>();
  for (let i = 0; i < races.length - 1; i++) {
    for (const result of races[i].Results) {
      const id = result.Driver.driverId;
      pointsBeforeLast.set(id, (pointsBeforeLast.get(id) ?? 0) + parseFloat(result.points));
    }
  }

  // Sort by points descending to get previous positions
  const prevSorted = [...pointsBeforeLast.entries()]
    .sort(([, a], [, b]) => b - a);
  const prevPositions = new Map<string, number>();
  prevSorted.forEach(([id], idx) => prevPositions.set(id, idx + 1));

  // Compare with current standings
  for (const s of currentStandings) {
    const prevPos = prevPositions.get(s.Driver.driverId);
    const currPos = parseInt(s.position, 10);
    if (prevPos !== undefined) {
      changes.set(s.Driver.driverId, prevPos - currPos); // positive = gained positions
    }
  }

  return changes;
}

function computeConstructorPositionChanges(
  races: RaceWithResults[],
  currentStandings: ConstructorStanding[],
): Map<string, number> {
  const changes = new Map<string, number>();
  if (races.length < 2) return changes;

  const pointsBeforeLast = new Map<string, number>();
  for (let i = 0; i < races.length - 1; i++) {
    for (const result of races[i].Results) {
      const id = result.Constructor.constructorId;
      pointsBeforeLast.set(id, (pointsBeforeLast.get(id) ?? 0) + parseFloat(result.points));
    }
  }

  const prevSorted = [...pointsBeforeLast.entries()]
    .sort(([, a], [, b]) => b - a);
  const prevPositions = new Map<string, number>();
  prevSorted.forEach(([id], idx) => prevPositions.set(id, idx + 1));

  for (const s of currentStandings) {
    const prevPos = prevPositions.get(s.Constructor.constructorId);
    const currPos = parseInt(s.position, 10);
    if (prevPos !== undefined) {
      changes.set(s.Constructor.constructorId, prevPos - currPos);
    }
  }

  return changes;
}

function PositionChange({ delta }: { delta: number | undefined }) {
  if (delta === undefined || delta === 0) {
    return <span className="text-white/20">&ndash;</span>;
  }
  if (delta > 0) {
    return <span className="text-emerald-400">&#9650;{delta}</span>;
  }
  return <span className="text-red-400">&#9660;{Math.abs(delta)}</span>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface StandingsViewProps {
  season: number;
  driverStandings: DriverStanding[];
  constructorStandings: ConstructorStanding[];
  driverHeadshots?: Record<string, string>;
  races?: RaceWithResults[];
}

export default function StandingsView({
  season,
  driverStandings,
  constructorStandings,
  driverHeadshots,
  races = [],
}: StandingsViewProps) {
  const engine = dominantEngines[String(season) as keyof typeof dominantEngines] ?? null;
  const favoriteDriverIds = usePreferencesStore((s) => s.favoriteDriverIds);

  const driverChanges = useMemo(
    () => computeDriverPositionChanges(races, driverStandings),
    [races, driverStandings],
  );
  const constructorChanges = useMemo(
    () => computeConstructorPositionChanges(races, constructorStandings),
    [races, constructorStandings],
  );
  const showChanges = races.length >= 2;

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
      <div className="grid gap-6 md:grid-cols-2">
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
                {driverStandings.map((s) => {
                  const isFav = favoriteDriverIds.includes(nameToSlug(s.Driver.givenName, s.Driver.familyName));
                  return (
                  <tr
                    key={s.Driver.driverId}
                    className={`border-b border-white/5 text-white/70 ${isFav ? "bg-white/[0.04]" : ""}`}
                  >
                    <td className="py-2 pr-3 font-mono text-xs text-white/40">
                      <span className="flex items-center gap-1.5">
                        {s.position}
                        {showChanges && (
                          <span className="text-[10px]">
                            <PositionChange delta={driverChanges.get(s.Driver.driverId)} />
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2">
                        <NationalityFlag nationality={s.Driver.nationality} />
                        <DriverImg
                          familyName={s.Driver.familyName}
                          name={`${s.Driver.givenName} ${s.Driver.familyName}`}
                          nationality={s.Driver.nationality}
                          espnUrl={driverHeadshots?.[s.Driver.driverId]}
                        />
                        <span>
                          <span className="font-medium text-white">
                            {s.Driver.givenName} {s.Driver.familyName}
                          </span>
                          {s.Driver.code && (
                            <span className="ml-1.5 text-xs text-white/30">
                              {s.Driver.code}
                            </span>
                          )}
                        </span>
                      </span>
                    </td>
                    <td className="hidden py-2 pr-3 sm:table-cell">
                      <span className="flex items-center gap-2 text-white/40">
                        {s.Constructors[0] && (
                          <TeamLogo
                            constructorId={s.Constructors[0].constructorId}
                            name={s.Constructors[0].name}
                            size={16}
                          />
                        )}
                        {s.Constructors[0]?.name ?? "\u2014"}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-xs">
                      {s.wins}
                    </td>
                    <td className="py-2 text-right font-mono text-xs font-semibold text-white">
                      {s.points}
                    </td>
                  </tr>
                  );
                })}
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
                      <span className="flex items-center gap-1.5">
                        {s.position}
                        {showChanges && (
                          <span className="text-[10px]">
                            <PositionChange delta={constructorChanges.get(s.Constructor.constructorId)} />
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2 font-medium text-white">
                        <TeamLogo
                          constructorId={s.Constructor.constructorId}
                          name={s.Constructor.name}
                        />
                        {s.Constructor.name}
                      </span>
                    </td>
                    <td className="hidden py-2 pr-3 sm:table-cell">
                      <span className="flex items-center gap-2 text-white/40">
                        <NationalityFlag nationality={s.Constructor.nationality} />
                        {s.Constructor.nationality}
                      </span>
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
