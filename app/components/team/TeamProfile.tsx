import Image from "next/image";
import Link from "next/link";
import { Team, Constructor, ReserveDriver } from "@/app/types";
import type { EngineManufacturer } from "@/app/types/f1-reference";
import { logoSrc, extractSlug } from "@/app/lib/image-helpers";
import { getBlurPlaceholder } from "@/app/lib/blur-placeholders";
import { driverSrc } from "@/app/lib/image-helpers";
import { getInitials } from "@/app/lib/drivers";
import { nationalityToFlag } from "@/app/lib/flags";
import TeamSocials from "./TeamSocials";

interface TeamProfileProps {
  team: Team;
  constructor: Constructor | null;
  engine?: EngineManufacturer | null;
}

function StatBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div
      className="rounded-lg border border-white/10 bg-white/5 p-3 text-center"
      style={color ? { borderTopColor: `${color}40`, borderTopWidth: 2 } : undefined}
    >
      <p className="text-xl font-bold" style={{ color: color ?? "#fff" }}>{value}</p>
      <p className="text-xs text-white/40 mt-1">{label}</p>
    </div>
  );
}

function DriverCard({ driver, team, accentColor }: { driver: Team["seat1"]; team: Team; accentColor: string }) {
  const slug = extractSlug(driver.headshotUrl, "drivers");
  const blur = slug ? getBlurPlaceholder(`drivers/${slug}`) : undefined;

  return (
    <Link
      href={`/driver/${driver.id}`}
      className="flex items-center gap-3 rounded-lg border border-white/10 border-l-2 bg-white/5 p-3 transition-colors hover:bg-white/10"
      style={{ borderLeftColor: accentColor }}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full"
        style={{ backgroundColor: `${accentColor}20` }}
      >
        {slug ? (
          <Image
            src={driverSrc(slug, 96)}
            alt={driver.name}
            width={48}
            height={48}
            className="h-12 w-12 rounded-full object-cover"
            placeholder={blur ? "blur" : undefined}
            blurDataURL={blur}
          />
        ) : (
          <span className="text-sm font-bold" style={{ color: accentColor }}>
            {getInitials(driver.name)}
          </span>
        )}
      </div>
      <div>
        <p className="font-medium text-white">{driver.name}</p>
        <p className="text-xs text-white/40">
          #{driver.number} &middot; {driver.nationality}
        </p>
      </div>
    </Link>
  );
}

function DriverRow({ driver, accentColor }: { driver: ReserveDriver; accentColor: string }) {
  const flag = nationalityToFlag(driver.nationality);
  const roleLabel = driver.role === "development" ? "Development" : driver.role === "test" ? "Test" : driver.role === "academy" ? "Academy" : "Reserve";
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      {flag && <span className="text-sm leading-none">{flag}</span>}
      <span className="text-sm text-white/70 flex-1">
        {driver.name}
        {driver.sharedWith && (
          <span className="ml-1.5 text-[10px] text-white/25">
            also {driver.sharedWith}
          </span>
        )}
      </span>
      {driver.series && (
        <span className="text-[10px] font-medium rounded-full px-2 py-0.5" style={{ backgroundColor: `${accentColor}15`, color: `${accentColor}99` }}>
          {driver.series}
        </span>
      )}
      <span className="text-xs text-white/30">{roleLabel}</span>
    </div>
  );
}

export default function TeamProfile({ team, constructor: ctor, engine }: TeamProfileProps) {
  const teamSlug = extractSlug(team.logoUrl, "logos");
  const logoBlur = teamSlug ? getBlurPlaceholder(`logos/${teamSlug}`) : undefined;
  const accentColor = team.id === "cadillac" ? "#FFFFFF" : team.color;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        {teamSlug ? (
          <Image
            src={logoSrc(teamSlug, 96)}
            alt={team.name}
            width={48}
            height={48}
            className="h-12 w-auto shrink-0 object-contain"
            placeholder={logoBlur ? "blur" : undefined}
            blurDataURL={logoBlur}
          />
        ) : (
          <div
            className="h-10 w-10 rounded-lg"
            style={{ backgroundColor: team.color }}
          />
        )}
        <div>
          <h1 className="font-display text-2xl font-bold" style={{ color: accentColor }}>{team.name}</h1>
          {ctor && (
            <p className="text-sm text-white/50 mt-1">
              {ctor.engine} power unit &middot;{" "}
              {Array.isArray(ctor.basedIn) ? ctor.basedIn.join(", ") : ctor.basedIn}
            </p>
          )}
        </div>
      </div>

      {/* Drivers */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: `${accentColor}99` }}>
          2026 Drivers
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <DriverCard driver={team.seat1} team={team} accentColor={accentColor} />
          <DriverCard driver={team.seat2} team={team} accentColor={accentColor} />
        </div>
      </div>

      {/* Reserve & test drivers */}
      {(() => {
        const all = team.reserveDrivers ?? [];
        const reserves = all.filter((d) => d.role === "reserve" || d.role === "test" || d.role === "development");
        const academy = all.filter((d) => d.role === "academy");
        if (reserves.length === 0 && academy.length === 0) return null;
        return (
          <>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: `${accentColor}99` }}>
                Reserve & Test Drivers
              </h2>
              {reserves.length > 0 ? (
                <div className="space-y-2">
                  {reserves.map((rd) => (
                    <DriverRow key={rd.name} driver={rd} accentColor={accentColor} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/30 italic">No reserve driver announced yet</p>
              )}
            </div>
            {academy.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: `${accentColor}99` }}>
                  Academy & Junior Drivers
                </h2>
                <div className="space-y-2">
                  {academy.map((rd) => (
                    <DriverRow key={rd.name} driver={rd} accentColor={accentColor} />
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Constructor stats */}
      {ctor && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: `${accentColor}99` }}>
            Constructor Stats
          </h2>
          <p className="text-sm text-white/50 mb-4">
            Active seasons: {ctor.seasons} &middot; Licensed in{" "}
            {Array.isArray(ctor.licensedIn)
              ? ctor.licensedIn.join(", ")
              : ctor.licensedIn}
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            <StatBox label="Wins" value={ctor.wins} color={accentColor} />
            <StatBox label="Poles" value={ctor.poles} color={accentColor} />
            <StatBox label="Podiums" value={ctor.podiums} color={accentColor} />
            <StatBox label="Fastest Laps" value={ctor.fastestLaps} color={accentColor} />
            <StatBox label="Points" value={ctor.points ?? "—"} color={accentColor} />
            <StatBox label="Races Entered" value={ctor.racesEntered} color={accentColor} />
            <StatBox label="WCC" value={ctor.wcc ?? 0} color={accentColor} />
            <StatBox label="WDC" value={ctor.wdc} color={accentColor} />
          </div>
        </div>
      )}

      {/* Power Unit */}
      {engine && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: `${accentColor}99` }}>
            Power Unit — {engine.manufacturer}
          </h2>
          <p className="mb-4 text-sm text-white/50">
            {engine.country} &middot; Active seasons: {engine.seasons}
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            <StatBox label="Wins" value={engine.wins} />
            <StatBox label="Poles" value={engine.poles} />
            <StatBox label="Podiums" value={engine.podiums} />
            <StatBox label="Fastest Laps" value={engine.fastestLaps} />
            <StatBox label="Points" value={engine.points ?? "—"} />
            <StatBox label="Races Entered" value={engine.racesEntered ?? "—"} />
            <StatBox label="WCC" value={engine.wcc ?? 0} />
            <StatBox label="WDC" value={engine.wdc} />
          </div>
          <p className="mt-2 text-[11px] text-white/30 italic">
            Performance across all teams powered by {engine.manufacturer}
          </p>
        </div>
      )}

      {/* Heritage */}
      {ctor?.antecedentTeams && ctor.antecedentTeams.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: `${accentColor}99` }}>
            Heritage
          </h2>
          <div className="relative ml-2 space-y-2 pl-4" style={{ borderLeftWidth: 1, borderLeftStyle: "solid", borderLeftColor: `${accentColor}30` }}>
            {ctor.antecedentTeams.map((ancestor) => (
              <div key={ancestor} className="relative">
                <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-white/20" />
                <p className="text-sm text-white/60">{ancestor}</p>
              </div>
            ))}
            <div className="relative">
              <div
                className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              <p className="text-sm font-medium text-white">{team.name} (present)</p>
            </div>
          </div>
        </div>
      )}

      {/* Social Links */}
      <TeamSocials team={team} accentColor={accentColor} />
    </div>
  );
}
