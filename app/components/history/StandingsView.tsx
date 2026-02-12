"use client";

import { useState } from "react";
import Image from "next/image";
import type { DriverStanding, ConstructorStanding } from "@/app/types/history";
import dominantEngines from "@/app/data/dominant-engines.json";

// Jolpica nationality string → ISO 3166-1 alpha-2 code (matching /public/flags/{code}.svg)
const NATIONALITY_TO_ISO: Record<string, string> = {
  American: "us",
  Argentine: "ar",
  Australian: "au",
  Austrian: "at",
  Belgian: "be",
  Brazilian: "br",
  British: "gb",
  Canadian: "ca",
  Chinese: "cn",
  Colombian: "co",
  Danish: "dk",
  Dutch: "nl",
  Estonian: "ee",
  Finnish: "fi",
  French: "fr",
  German: "de",
  Hungarian: "hu",
  Indian: "in",
  Indonesian: "id",
  Italian: "it",
  Japanese: "jp",
  Korean: "kr",
  Malaysian: "my",
  Mexican: "mx",
  Monegasque: "mc",
  "New Zealander": "nz",
  Polish: "pl",
  Portuguese: "pt",
  Russian: "ru",
  "Saudi Arabian": "sa",
  "South African": "za",
  Spanish: "es",
  Swedish: "se",
  Swiss: "ch",
  Thai: "th",
  Turkish: "tr",
  Venezuelan: "ve",
};

// Map Jolpica constructorId to our local logo filename
function constructorLogoSrc(constructorId: string): string | null {
  const mapped = constructorId.replace(/_/g, "-");
  const known = [
    "red-bull", "mclaren", "ferrari", "mercedes", "aston-martin",
    "alpine", "williams", "racing-bulls", "audi", "haas", "cadillac",
    "rb-f1-team", "alphatauri", "alfa-romeo", "sauber", "renault",
  ];
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
  // Try PNG fallback for historical teams (e.g. renault.png)
  const pngTeams = ["renault", "alphatauri"];
  if (pngTeams.includes(resolved) || pngTeams.includes(mapped)) {
    return `/logos/${resolved}.png`;
  }
  return null;
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function driverKey(familyName: string): string {
  return stripAccents(familyName).toLowerCase().replace(/\s+/g, "-");
}

function DriverImg({ familyName, name }: { familyName: string; name: string }) {
  const [attempt, setAttempt] = useState(0); // 0=webp, 1=png, 2=fallback
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

function TeamLogo({ constructorId, name, size = 20 }: { constructorId: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const src = constructorLogoSrc(constructorId);
  if (!src || err) {
    return null;
  }
  const cls = size >= 20 ? "h-5 w-auto shrink-0 object-contain" : "h-4 w-auto shrink-0 object-contain";
  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      className={cls}
      onError={() => setErr(true)}
    />
  );
}

function NationalityFlag({ nationality }: { nationality: string }) {
  const code = NATIONALITY_TO_ISO[nationality];
  if (!code) return null;
  return (
    <Image
      src={`/flags/${code}.svg`}
      alt={nationality}
      width={16}
      height={12}
      className="h-3 w-4 shrink-0 rounded-[2px] object-cover"
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
                        <NationalityFlag nationality={s.Driver.nationality} />
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
                    <td className="hidden py-2 pr-3 sm:table-cell">
                      <span className="flex items-center gap-2 text-white/40">
                        {s.Constructors[0] && (
                          <TeamLogo
                            constructorId={s.Constructors[0].constructorId}
                            name={s.Constructors[0].name}
                            size={16}
                          />
                        )}
                        {s.Constructors[0]?.name ?? "—"}
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
