"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { usePreferencesStore } from "@/app/stores/preferences";
import { logoSrc, driverSrc, extractSlug } from "@/app/lib/image-helpers";
import { getBlurPlaceholder } from "@/app/lib/blur-placeholders";
import type { Team, Driver } from "@/app/types";

// ---------------------------------------------------------------------------
// Minimal team/driver info for the dropdown
// ---------------------------------------------------------------------------
interface SettingsTeam {
  id: string;
  name: string;
  color: string;
  logoUrl?: string;
  drivers: { id: string; name: string; headshotUrl?: string }[];
}

function buildSettingsTeams(teams: Team[]): SettingsTeam[] {
  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    logoUrl: t.logoUrl,
    drivers: [t.seat1, t.seat2]
      .filter((d): d is Driver => d.contractStatus !== "open")
      .map((d) => ({ id: d.id, name: d.name, headshotUrl: d.headshotUrl })),
  }));
}

interface SettingsDropdownProps {
  teams: Team[];
}

export default function SettingsDropdown({ teams }: SettingsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const favoriteTeamId = usePreferencesStore((s) => s.favoriteTeamId);
  const favoriteDriverIds = usePreferencesStore((s) => s.favoriteDriverIds);
  const timeFormat = usePreferencesStore((s) => s.timeFormat);
  const speedUnit = usePreferencesStore((s) => s.speedUnit);
  const tempUnit = usePreferencesStore((s) => s.tempUnit);
  const setFavoriteTeam = usePreferencesStore((s) => s.setFavoriteTeam);
  const toggleFavoriteDriver = usePreferencesStore((s) => s.toggleFavoriteDriver);
  const setTimeFormat = usePreferencesStore((s) => s.setTimeFormat);
  const setSpeedUnit = usePreferencesStore((s) => s.setSpeedUnit);
  const setTempUnit = usePreferencesStore((s) => s.setTempUnit);

  const settingsTeams = buildSettingsTeams(teams);
  const allDrivers = settingsTeams.flatMap((t) =>
    t.drivers.map((d) => ({ ...d, teamColor: t.color })),
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setDriverPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setDriverPickerOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const selectedTeam = settingsTeams.find((t) => t.id === favoriteTeamId);

  return (
    <div ref={panelRef} className="relative">
      {/* Gear icon button */}
      <button
        onClick={() => {
          setOpen(!open);
          if (open) setDriverPickerOpen(false);
        }}
        className="cursor-pointer rounded-full p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
        aria-label="Settings"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-white/10 bg-[#1a1a1a] p-4 shadow-2xl sm:w-80">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
            Preferences
          </h3>

          {/* Favorite Team */}
          <div className="mb-3">
            <label className="mb-1 block text-xs text-white/50">Favorite Team</label>
            <select
              value={favoriteTeamId ?? ""}
              onChange={(e) => setFavoriteTeam(e.target.value || null)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
            >
              <option value="" className="bg-[#111]">None</option>
              {settingsTeams.map((t) => (
                <option key={t.id} value={t.id} className="bg-[#111]">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Favorite Drivers */}
          <div className="mb-3">
            <label className="mb-1 block text-xs text-white/50">
              Favorite Drivers ({favoriteDriverIds.length}/2)
            </label>
            <div className="space-y-1">
              {favoriteDriverIds.map((id) => {
                const driver = allDrivers.find((d) => d.id === id);
                if (!driver) return null;
                const slug = extractSlug(driver.headshotUrl, "drivers");
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: driver.teamColor }}
                    />
                    {slug && (
                      <Image
                        src={driverSrc(slug, 48)}
                        alt={driver.name}
                        width={20}
                        height={20}
                        className="h-5 w-5 shrink-0 rounded-full object-cover"
                      />
                    )}
                    <span className="flex-1 text-sm text-white/80">{driver.name}</span>
                    <button
                      onClick={() => toggleFavoriteDriver(id)}
                      className="cursor-pointer text-white/30 transition-colors hover:text-white/60"
                      aria-label={`Remove ${driver.name}`}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
              {favoriteDriverIds.length < 2 && (
                <button
                  onClick={() => setDriverPickerOpen(!driverPickerOpen)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-dashed border-white/10 px-3 py-2 text-sm text-white/40 transition-colors hover:border-white/20 hover:text-white/60"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add driver
                </button>
              )}
            </div>
            {/* Mini driver picker */}
            {driverPickerOpen && (
              <div className="mt-2 max-h-48 space-y-0.5 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.03] p-1">
                {allDrivers
                  .filter((d) => !favoriteDriverIds.includes(d.id))
                  .map((driver) => (
                    <button
                      key={driver.id}
                      onClick={() => {
                        toggleFavoriteDriver(driver.id);
                        if (favoriteDriverIds.length >= 1) {
                          setDriverPickerOpen(false);
                        }
                      }}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-white/70 transition-colors hover:bg-white/10"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: driver.teamColor }}
                      />
                      <span>{driver.name}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-3 border-t border-white/10" />

          {/* Time Format */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-white/50">Time Format</span>
            <div className="flex overflow-hidden rounded-lg border border-white/10">
              <button
                onClick={() => setTimeFormat("12h")}
                className={`cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors ${
                  timeFormat === "12h"
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                12h
              </button>
              <button
                onClick={() => setTimeFormat("24h")}
                className={`cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors ${
                  timeFormat === "24h"
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                24h
              </button>
            </div>
          </div>

          {/* Speed Unit */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-white/50">Speed</span>
            <div className="flex overflow-hidden rounded-lg border border-white/10">
              <button
                onClick={() => setSpeedUnit("mph")}
                className={`cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors ${
                  speedUnit === "mph"
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                MPH
              </button>
              <button
                onClick={() => setSpeedUnit("kph")}
                className={`cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors ${
                  speedUnit === "kph"
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                KPH
              </button>
            </div>
          </div>

          {/* Temp Unit */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Temperature</span>
            <div className="flex overflow-hidden rounded-lg border border-white/10">
              <button
                onClick={() => setTempUnit("F")}
                className={`cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors ${
                  tempUnit === "F"
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                °F
              </button>
              <button
                onClick={() => setTempUnit("C")}
                className={`cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors ${
                  tempUnit === "C"
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                °C
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
