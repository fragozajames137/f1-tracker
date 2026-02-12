"use client";

import { useState } from "react";
import Image from "next/image";
import type { DriverStanding, ConstructorStanding } from "@/app/types/history";
import dominantEngines from "@/app/data/dominant-engines.json";

// Map Jolpica constructorId to our local logo filename
function constructorLogoSrc(constructorId: string): string | null {
  const mapped = constructorId.replace(/_/g, "-");
  const known = [
    "red-bull", "mclaren", "ferrari", "mercedes", "aston-martin",
    "alpine", "williams", "racing-bulls", "audi", "haas", "cadillac",
    "rb-f1-team", "alphatauri", "alfa-romeo", "sauber",
  ];
  // Handle common aliases
  const aliases: Record<string, string> = {
    "rb-f1-team": "racing-bulls",
    "alphatauri": "racing-bulls",
    "alfa-romeo": "audi",
    "sauber": "audi",
    "kick-sauber": "audi",
  };
  const resolved = aliases[mapped] ?? mapped;
  if (known.includes(resolved) || known.includes(mapped)) {
    return `/logos/${resolved}.webp`;
  }
  return null;
}

// Map Jolpica driver familyName to our local headshot
function driverHeadshotSrc(familyName: string): string {
  return `/drivers/${familyName.toLowerCase().replace(/\s+/g, "-")}.webp`;
}

function DriverImg({ familyName, name }: { familyName: string; name: string }) {
  const [err, setErr] = useState(false);
  const src = driverHeadshotSrc(familyName);
  if (err) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[9px] font-bold text-white/40">
        {name.charAt(0)}
      </span>
    );
  }
  return (
    <Image
      src={src}
      alt={name}
      width={24}
      height={24}
      className="h-6 w-6 shrink-0 rounded-full object-cover"
      onError={() => setErr(true)}
    />
  );
}

function TeamLogo({ constructorId, name }: { constructorId: string; name: string }) {
  const [err, setErr] = useState(false);
  const src = constructorLogoSrc(constructorId);
  if (!src || err) {
    return null;
  }
  return (
    <Image
      src={src}
      alt={name}
      width={20}
      height={20}
      className="h-5 w-auto shrink-0 object-contain"
      onError={() => setErr(true)}
    />
  );
}

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
                      <span className="flex items-center gap-2">
                        <DriverImg
                          familyName={s.Driver.familyName}
                          name={`${s.Driver.givenName} ${s.Driver.familyName}`}
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
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2 font-medium text-white">
                        <TeamLogo
                          constructorId={s.Constructor.constructorId}
                          name={s.Constructor.name}
                        />
                        {s.Constructor.name}
                      </span>
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
