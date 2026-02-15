import Image from "next/image";
import Link from "next/link";
import { Driver, Team } from "@/app/types";
import { nationalityToIso } from "@/app/lib/flags";
import Flag from "../Flag";
import { getInitials } from "@/app/lib/drivers";
import { driverSrc, logoSrc, extractSlug } from "@/app/lib/image-helpers";
import { getBlurPlaceholder } from "@/app/lib/blur-placeholders";

interface DriverHeaderProps {
  driver: Driver;
  team: Team;
}

export default function DriverHeader({ driver, team }: DriverHeaderProps) {
  const driverSlug = extractSlug(driver.headshotUrl, "drivers");
  const teamSlug = extractSlug(team.logoUrl, "logos");
  const driverBlur = driverSlug ? getBlurPlaceholder(`drivers/${driverSlug}`) : undefined;
  const logoBlur = teamSlug ? getBlurPlaceholder(`logos/${teamSlug}`) : undefined;
  const accentColor = team.id === "cadillac" ? "#FFFFFF" : team.color;

  return (
    <div className="flex items-center gap-4">
      {/* Headshot */}
      <div
        className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2"
        style={{
          backgroundColor: `${accentColor}20`,
          boxShadow: `0 0 0 2px ${accentColor}`,
        }}
      >
        {driverSlug ? (
          <Image
            src={driverSrc(driverSlug, 192)}
            alt={driver.name}
            width={80}
            height={80}
            className="h-20 w-20 rounded-full object-cover"
            placeholder={driverBlur ? "blur" : undefined}
            blurDataURL={driverBlur}
          />
        ) : (
          <span className="text-xl font-bold" style={{ color: accentColor }}>
            {getInitials(driver.name)}
          </span>
        )}
      </div>

      <div>
        <Link href={`/team/${team.id}`} className="flex items-center gap-3 transition-opacity hover:opacity-80">
          {teamSlug && (
            <Image
              src={logoSrc(teamSlug, 96)}
              alt={team.name}
              width={20}
              height={20}
              className="h-5 w-auto shrink-0 object-contain"
              placeholder={logoBlur ? "blur" : undefined}
              blurDataURL={logoBlur}
            />
          )}
          <span className="text-sm font-medium text-white/60">{team.name}</span>
        </Link>
        <h1 className="font-display text-xl font-bold text-white mt-1 sm:text-2xl">{driver.name}</h1>
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          {driver.number && (
            <span className="text-xl font-mono font-bold" style={{ color: accentColor }}>
              #{driver.number}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-sm text-white/50">
            {nationalityToIso(driver.nationality) && (
              <Flag iso={nationalityToIso(driver.nationality)!} size={16} />
            )}
            {driver.nationality}
          </span>
        </div>
      </div>
    </div>
  );
}
