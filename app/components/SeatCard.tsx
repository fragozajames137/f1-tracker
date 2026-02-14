"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Driver } from "@/app/types";
import { nationalityToIso } from "@/app/lib/flags";
import Flag from "./Flag";
import { getInitials } from "@/app/lib/drivers";
import { driverSrc, extractSlug } from "@/app/lib/image-helpers";
import { getBlurPlaceholder } from "@/app/lib/blur-placeholders";

interface SeatCardProps {
  driver: Driver;
  teamColor: string;
  seatLabel: string;
}

export default function SeatCard({ driver, teamColor, seatLabel }: SeatCardProps) {
  const isOpen = driver.contractStatus === "open";
  const [imgError, setImgError] = useState(false);
  const slug = extractSlug(driver.headshotUrl, "drivers");
  const blur = slug ? getBlurPlaceholder(`drivers/${slug}`) : undefined;

  return (
    <Link
      href={`/driver/${driver.id}`}
      aria-label={driver.name}
      className="group relative w-full rounded-xl border border-white/10 border-l-[3px] bg-white/5 p-4 text-left transition-all hover:bg-white/10 hover:border-white/20 block"
      style={{ borderLeftColor: teamColor }}
    >
      <div className="flex items-center gap-3">
        {/* Headshot */}
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full"
          style={{ backgroundColor: `${teamColor}20` }}
        >
          {slug && !imgError ? (
            <Image
              src={driverSrc(slug, 192)}
              alt={driver.name}
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover"
              placeholder={blur ? "blur" : undefined}
              blurDataURL={blur}
              onError={() => setImgError(true)}
            />
          ) : (
            <span
              className="text-sm font-bold"
              style={{ color: teamColor }}
            >
              {getInitials(driver.name)}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">{seatLabel}</p>

          <p className={`text-lg font-bold ${isOpen ? "text-white/40 italic" : "text-white"}`}>
            {driver.name}
          </p>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {driver.number && (
              <span className="text-sm font-mono text-white/50">#{driver.number}</span>
            )}
            <span className="inline-flex items-center gap-1.5 text-xs">
              {nationalityToIso(driver.nationality) && (
                <Flag iso={nationalityToIso(driver.nationality)!} size={14} className="opacity-80" />
              )}
              <span className="text-white/40">{driver.nationality}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="absolute top-3 right-3 text-white/20 transition-colors group-hover:text-white/50">
        <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
