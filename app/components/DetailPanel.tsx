"use client";

import { useState } from "react";
import Image from "next/image";
import { Driver, Team } from "@/app/types";
import { nationalityToIso } from "@/app/lib/flags";
import Flag from "./Flag";
import { STATUS_CONFIG, getInitials } from "@/app/lib/drivers";
import { driverSrc, logoSrc, extractSlug } from "@/app/lib/image-helpers";
import { getBlurPlaceholder } from "@/app/lib/blur-placeholders";

interface DetailPanelProps {
  driver: Driver | null;
  team: Team | null;
  onClose: () => void;
}

export default function DetailPanel({ driver, team, onClose }: DetailPanelProps) {
  const [imgError, setImgError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  if (!driver || !team) return null;

  const driverSlug = extractSlug(driver.headshotUrl, "drivers");
  const teamSlug = extractSlug(team.logoUrl, "logos");
  const driverBlur = driverSlug ? getBlurPlaceholder(`drivers/${driverSlug}`) : undefined;
  const logoBlur = teamSlug ? getBlurPlaceholder(`logos/${teamSlug}`) : undefined;

  const status = STATUS_CONFIG[driver.contractStatus];

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${driver.name} details`}
        className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto border-l border-white/10 bg-[#111] shadow-2xl sm:max-w-md"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#111]/95 backdrop-blur-sm">
          <div className="flex items-center justify-between p-4 sm:p-5">
            <div className="flex items-center gap-3">
              {teamSlug && !logoError ? (
                <Image
                  src={logoSrc(teamSlug, 48)}
                  alt={team.name}
                  width={20}
                  height={20}
                  className="h-5 w-auto shrink-0 object-contain"
                  placeholder={logoBlur ? "blur" : undefined}
                  blurDataURL={logoBlur}
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div
                  className="h-4 w-4 rounded-sm"
                  style={{ backgroundColor: team.color }}
                />
              )}
              <span className="text-sm font-medium text-white/60">{team.name}</span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close detail panel"
              className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 sm:p-5">
          {/* Driver Info */}
          <div className="flex items-center gap-4">
            {/* Headshot */}
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2"
              style={{
                backgroundColor: `${team.color}20`,
                boxShadow: `0 0 0 2px ${team.color}`,
              }}
            >
              {driverSlug && !imgError ? (
                <Image
                  src={driverSrc(driverSlug, 192)}
                  alt={driver.name}
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-full object-cover"
                  placeholder={driverBlur ? "blur" : undefined}
                  blurDataURL={driverBlur}
                  onError={() => setImgError(true)}
                />
              ) : (
                <span
                  className="text-xl font-bold"
                  style={{ color: team.color }}
                >
                  {getInitials(driver.name)}
                </span>
              )}
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold text-white">{driver.name}</h2>
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                {driver.number && (
                  <span className="text-xl font-mono font-bold" style={{ color: team.color }}>
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

          {/* Contract Status */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
              Contract Status
            </h3>
            <span className={`inline-block rounded-full border px-3 py-1 text-sm font-semibold ${status.className}`}>
              {status.detailLabel}
            </span>
            {driver.contractEnd && (
              <p className="mt-2 text-sm text-white/50">
                Contract expires end of <span className="text-white/80 font-medium">{driver.contractEnd}</span>
              </p>
            )}
            {!driver.contractEnd && driver.contractStatus === "open" && (
              <p className="mt-2 text-sm text-white/50 italic">No driver announced</p>
            )}
          </div>

          {/* Rumors */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
              Rumors & Sources ({driver.rumors.length})
            </h3>

            {driver.rumors.length === 0 ? (
              <p className="text-sm text-white/30 italic">No rumors at the moment.</p>
            ) : (
              <div className="space-y-3">
                {driver.rumors.map((rumor, i) => (
                  <a
                    key={i}
                    href={rumor.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10 hover:border-white/20"
                  >
                    <p className="text-sm text-white/80 leading-relaxed">{rumor.text}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: team.color }}>
                        {rumor.source}
                      </span>
                      <span className="text-xs text-white/30">{rumor.date}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
