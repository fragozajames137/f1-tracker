"use client";

import { useState, useEffect, useRef } from "react";
import type { RaceWithResults } from "@/app/types/history";
import { NationalityFlag, DriverImg, TeamLogo } from "./shared";
import SessionDrillDown from "./SessionDrillDown";

interface RaceResultsViewProps {
  races: RaceWithResults[];
  season: number;
  driverHeadshots?: Record<string, string>;
}

export default function RaceResultsView({ races, season, driverHeadshots }: RaceResultsViewProps) {
  const [selectedRound, setSelectedRound] = useState<number>(() =>
    races.length > 0 ? races.length - 1 : 0,
  );
  const [sessionKey, setSessionKey] = useState<number | null>(null);
  const [availableRounds, setAvailableRounds] = useState<Map<number, number>>(new Map());
  const drillDownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (season < 2018) return;
    const ac = new AbortController();
    fetch(`/api/sessions?year=${season}&type=Race`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((sessions: Array<{ round: number; sessionKey: number }>) => {
        if (ac.signal.aborted) return;
        const map = new Map<number, number>();
        for (const s of sessions) map.set(s.round, s.sessionKey);
        setAvailableRounds(map);
      })
      .catch(() => {});
    return () => ac.abort();
  }, [season]);

  if (races.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-sm text-white/40">
          No race results available for this season.
        </p>
      </div>
    );
  }

  const race = races[selectedRound];
  const roundNum = parseInt(race.round, 10);
  const roundSessionKey = availableRounds.get(roundNum) ?? null;

  function handleViewSession() {
    if (roundSessionKey) {
      setSessionKey(roundSessionKey);
      // Scroll to the drill-down after React renders it
      requestAnimationFrame(() => {
        drillDownRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Round selector + circuit info */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={selectedRound}
          onChange={(e) => {
            setSelectedRound(parseInt(e.target.value, 10));
            setSessionKey(null);
          }}
          className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 sm:w-auto"
        >
          {races.map((r, i) => (
            <option key={r.round} value={i} className="bg-[#111]">
              R{r.round} — {r.raceName}
            </option>
          ))}
        </select>
        <span className="text-sm text-white/40">
          {race.Circuit.circuitName} — {race.Circuit.Location.locality},{" "}
          {race.Circuit.Location.country}
        </span>
        {roundSessionKey && !sessionKey && (
          <button
            onClick={handleViewSession}
            className="cursor-pointer rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white sm:ml-auto"
          >
            View Session
          </button>
        )}
      </div>

      {/* Results table */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/30">
                <th className="pb-2 pr-3 font-medium">Pos</th>
                <th className="pb-2 pr-3 font-medium">Driver</th>
                <th className="hidden pb-2 pr-3 font-medium sm:table-cell">Team</th>
                <th className="pb-2 pr-3 text-right font-medium">Grid</th>
                <th className="hidden pb-2 pr-3 text-right font-medium sm:table-cell">
                  Laps
                </th>
                <th className="pb-2 pr-3 text-right font-medium">Time / Status</th>
                <th className="pb-2 text-right font-medium">Pts</th>
              </tr>
            </thead>
            <tbody>
              {race.Results.map((r) => (
                <tr
                  key={`${r.Driver.driverId}-${r.position}`}
                  className="border-b border-white/5 text-white/70"
                >
                  <td className="py-2 pr-3 font-mono text-xs text-white/40">
                    {r.positionText}
                  </td>
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-2">
                      <NationalityFlag nationality={r.Driver.nationality} />
                      <DriverImg
                        familyName={r.Driver.familyName}
                        name={`${r.Driver.givenName} ${r.Driver.familyName}`}
                        nationality={r.Driver.nationality}
                        espnUrl={driverHeadshots?.[r.Driver.driverId]}
                      />
                      <span>
                        <span className="font-medium text-white">
                          {r.Driver.givenName} {r.Driver.familyName}
                        </span>
                        {r.Driver.code && (
                          <span className="ml-1.5 text-xs text-white/30">
                            {r.Driver.code}
                          </span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="hidden py-2 pr-3 sm:table-cell">
                    <span className="flex items-center gap-1.5 text-white/40">
                      <TeamLogo
                        constructorId={r.Constructor.constructorId}
                        name={r.Constructor.name}
                      />
                      {r.Constructor.name}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    {r.grid}
                  </td>
                  <td className="hidden py-2 pr-3 text-right font-mono text-xs sm:table-cell">
                    {r.laps}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    {r.Time?.time ?? r.status}
                  </td>
                  <td className="py-2 text-right font-mono text-xs font-semibold text-white">
                    {r.points !== "0" ? r.points : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Session drill-down */}
      {sessionKey && (
        <div ref={drillDownRef}>
          <SessionDrillDown
            sessionKey={sessionKey}
            onClose={() => setSessionKey(null)}
          />
        </div>
      )}
    </div>
  );
}
