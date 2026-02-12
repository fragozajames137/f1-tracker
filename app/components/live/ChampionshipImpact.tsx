"use client";

import { useState, useEffect, useMemo } from "react";
import type {
  OpenF1Driver,
  OpenF1Position,
  ProjectedDriverStanding,
  ProjectedConstructorStanding,
} from "@/app/types/openf1";
import type {
  DriverStanding,
  ConstructorStanding,
} from "@/app/types/history";
import {
  fetchDriverStandings,
  fetchConstructorStandings,
} from "@/app/lib/history";
import { fetchWithCache } from "@/app/lib/cache";
import {
  computeProjectedDriverStandings,
  computeProjectedConstructorStandings,
} from "@/app/lib/championship";

interface ChampionshipImpactProps {
  drivers: OpenF1Driver[];
  positions: OpenF1Position[];
  sessionType: string;
  year: number;
}

function DeltaIndicator({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="text-xs font-bold text-green-400">
        ▲ {delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="text-xs font-bold text-red-400">
        ▼ {Math.abs(delta)}
      </span>
    );
  }
  return <span className="text-xs text-white/30">—</span>;
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className="h-8 animate-pulse rounded bg-white/5"
        />
      ))}
    </div>
  );
}

export default function ChampionshipImpact({
  drivers,
  positions,
  sessionType,
  year,
}: ChampionshipImpactProps) {
  const [driverStandings, setDriverStandings] = useState<DriverStanding[] | null>(null);
  const [constructorStandings, setConstructorStandings] = useState<ConstructorStanding[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  const isRaceOrSprint = sessionType === "Race" || sessionType === "Sprint";
  const isSprint = sessionType === "Sprint";

  // Fetch standings on mount
  useEffect(() => {
    if (!isRaceOrSprint) return;

    const abortController = new AbortController();
    setLoading(true);

    const STANDINGS_TTL = 10 * 60 * 1000; // 10 minutes
    Promise.all([
      fetchWithCache(`driver-standings-${year}`, () => fetchDriverStandings(year), STANDINGS_TTL),
      fetchWithCache(`constructor-standings-${year}`, () => fetchConstructorStandings(year), STANDINGS_TTL),
    ])
      .then(([ds, cs]) => {
        if (abortController.signal.aborted) return;
        setDriverStandings(ds);
        setConstructorStandings(cs);
        setLoading(false);
      })
      .catch(() => {
        if (!abortController.signal.aborted) setLoading(false);
      });

    return () => abortController.abort();
  }, [year, isRaceOrSprint]);

  const projectedDrivers = useMemo((): ProjectedDriverStanding[] => {
    if (!driverStandings || drivers.length === 0) return [];
    return computeProjectedDriverStandings(
      drivers,
      positions,
      driverStandings,
      isSprint,
    );
  }, [drivers, positions, driverStandings, isSprint]);

  const projectedConstructors = useMemo((): ProjectedConstructorStanding[] => {
    if (!constructorStandings || projectedDrivers.length === 0) return [];
    return computeProjectedConstructorStandings(
      projectedDrivers,
      constructorStandings,
      drivers,
    );
  }, [projectedDrivers, constructorStandings, drivers]);

  if (!isRaceOrSprint) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-white/5">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-3"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
          Championship Impact
        </h3>
        <svg
          className={`h-4 w-4 text-white/40 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3">
          {loading ? (
            <SkeletonRows />
          ) : driverStandings === null || driverStandings.length === 0 ? (
            <p className="text-sm text-white/30">
              No standings data available for {year}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Driver standings */}
              <div className="lg:col-span-2">
                <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                  Driver Standings
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase text-white/30">
                        <th className="pb-2 pr-2">Pos</th>
                        <th className="pb-2 pr-2">Driver</th>
                        <th className="pb-2 pr-2 text-right">Pre-Race</th>
                        <th className="pb-2 pr-2 text-right">+Pts</th>
                        <th className="pb-2 pr-2 text-right">Projected</th>
                        <th className="pb-2 text-center">Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectedDrivers.map((d) => (
                        <tr
                          key={d.driverCode}
                          className="border-b border-white/5"
                        >
                          <td className="py-1.5 pr-2 tabular-nums text-white/50">
                            {d.projectedPosition}
                          </td>
                          <td className="py-1.5 pr-2">
                            <span
                              className="font-semibold"
                              style={{ color: d.teamColor }}
                            >
                              {d.driverCode}
                            </span>
                          </td>
                          <td className="py-1.5 pr-2 text-right tabular-nums text-white/50">
                            {d.preRacePoints}
                          </td>
                          <td className="py-1.5 pr-2 text-right tabular-nums text-green-400">
                            {d.pointsDelta > 0 ? `+${d.pointsDelta}` : "—"}
                          </td>
                          <td className="py-1.5 pr-2 text-right tabular-nums font-semibold text-white">
                            {d.projectedPoints}
                          </td>
                          <td className="py-1.5 text-center">
                            <DeltaIndicator delta={d.positionDelta} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Constructor standings */}
              <div>
                <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                  Constructor Standings
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase text-white/30">
                        <th className="pb-2 pr-2">Pos</th>
                        <th className="pb-2 pr-2">Team</th>
                        <th className="pb-2 pr-2 text-right">Projected</th>
                        <th className="pb-2 text-center">Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectedConstructors.map((c) => (
                        <tr
                          key={c.constructorId}
                          className="border-b border-white/5"
                        >
                          <td className="py-1.5 pr-2 tabular-nums text-white/50">
                            {c.projectedPosition}
                          </td>
                          <td className="py-1.5 pr-2">
                            <span
                              className="font-semibold"
                              style={{ color: c.teamColor }}
                            >
                              {c.constructorName}
                            </span>
                          </td>
                          <td className="py-1.5 pr-2 text-right tabular-nums font-semibold text-white">
                            {c.projectedPoints}
                          </td>
                          <td className="py-1.5 text-center">
                            <DeltaIndicator delta={c.positionDelta} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
