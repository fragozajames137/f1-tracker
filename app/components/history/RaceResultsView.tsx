"use client";

import { useState } from "react";
import Image from "next/image";
import type { RaceWithResults } from "@/app/types/history";

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function driverKey(familyName: string): string {
  return stripAccents(familyName).toLowerCase().replace(/\s+/g, "-");
}

function DriverImg({ familyName, name }: { familyName: string; name: string }) {
  const [attempt, setAttempt] = useState(0);
  const key = driverKey(familyName);
  if (attempt >= 2) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[9px] font-bold text-white/40">
        {name.charAt(0)}
      </span>
    );
  }
  const ext = attempt === 0 ? "webp" : "png";
  return (
    <Image
      src={`/drivers/${key}.${ext}`}
      alt={name}
      width={24}
      height={24}
      className="h-6 w-6 shrink-0 rounded-full object-cover"
      onError={() => setAttempt((a) => a + 1)}
    />
  );
}

function constructorLogoSrc(constructorId: string): string | null {
  const mapped = constructorId.replace(/_/g, "-");
  const aliases: Record<string, string> = {
    "rb-f1-team": "racing-bulls",
    "alphatauri": "racing-bulls",
    "alfa-romeo": "audi",
    "sauber": "audi",
    "kick-sauber": "audi",
  };
  const resolved = aliases[mapped] ?? mapped;
  const known = [
    "red-bull", "mclaren", "ferrari", "mercedes", "aston-martin",
    "alpine", "williams", "racing-bulls", "audi", "haas", "cadillac",
  ];
  if (known.includes(resolved)) return `/logos/${resolved}.webp`;
  return null;
}

function TeamLogo({ constructorId, name }: { constructorId: string; name: string }) {
  const [err, setErr] = useState(false);
  const src = constructorLogoSrc(constructorId);
  if (!src || err) return null;
  return (
    <Image
      src={src}
      alt={name}
      width={16}
      height={16}
      className="h-4 w-auto shrink-0 object-contain"
      onError={() => setErr(true)}
    />
  );
}

interface RaceResultsViewProps {
  races: RaceWithResults[];
}

export default function RaceResultsView({ races }: RaceResultsViewProps) {
  const [selectedRound, setSelectedRound] = useState<number>(() =>
    races.length > 0 ? races.length - 1 : 0,
  );

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

  return (
    <div className="space-y-4">
      {/* Round selector + circuit info */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={selectedRound}
          onChange={(e) => setSelectedRound(parseInt(e.target.value, 10))}
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
                      <DriverImg
                        familyName={r.Driver.familyName}
                        name={`${r.Driver.givenName} ${r.Driver.familyName}`}
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
    </div>
  );
}
