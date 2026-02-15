"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { usePreferencesStore } from "@/app/stores/preferences";
import { logoSrc, driverSrc, extractSlug } from "@/app/lib/image-helpers";
import { getBlurPlaceholder } from "@/app/lib/blur-placeholders";
import type { Team, Driver } from "@/app/types";

// ---------------------------------------------------------------------------
// Minimal team/driver data passed from server → client
// ---------------------------------------------------------------------------
export interface WelcomeTeam {
  id: string;
  name: string;
  color: string;
  logoUrl?: string;
  drivers: { id: string; name: string; headshotUrl?: string }[];
}

function buildWelcomeTeams(teams: Team[]): WelcomeTeam[] {
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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface WelcomeModalProps {
  teams: Team[];
}

type Step = "email" | "team" | "drivers";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function WelcomeModal({ teams }: WelcomeModalProps) {
  const hasCompleted = usePreferencesStore((s) => s.hasCompletedWelcome);
  const completeWelcome = usePreferencesStore((s) => s.completeWelcome);
  const setFavoriteTeam = usePreferencesStore((s) => s.setFavoriteTeam);
  const toggleFavoriteDriver = usePreferencesStore((s) => s.toggleFavoriteDriver);
  const favoriteDriverIds = usePreferencesStore((s) => s.favoriteDriverIds);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const welcomeTeams = buildWelcomeTeams(teams);

  // Wait for hydration so persist store is loaded
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !hasCompleted) {
      dialogRef.current?.showModal();
    }
  }, [hydrated, hasCompleted]);

  const dismiss = useCallback(() => {
    completeWelcome();
    dialogRef.current?.close();
  }, [completeWelcome]);

  if (!hydrated || hasCompleted) return null;

  // -------------------------------------------------------------------------
  // Email step
  // -------------------------------------------------------------------------
  async function handleEmailContinue() {
    if (!email.trim()) {
      // Skip email, move to team step
      setStep("team");
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email.trim())) {
      setEmailError("Please enter a valid email address");
      return;
    }
    setSubmittingEmail(true);
    try {
      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch {
      // Silently fail — email is optional
    }
    setSubmittingEmail(false);
    setStep("team");
  }

  // -------------------------------------------------------------------------
  // Team step
  // -------------------------------------------------------------------------
  function handleTeamContinue() {
    setFavoriteTeam(selectedTeam);
    setStep("drivers");
  }

  // -------------------------------------------------------------------------
  // Drivers step
  // -------------------------------------------------------------------------
  function handleDone() {
    dismiss();
  }

  // -------------------------------------------------------------------------
  // Step indicator
  // -------------------------------------------------------------------------
  const steps: Step[] = ["email", "team", "drivers"];
  const stepIndex = steps.indexOf(step);

  return (
    <dialog
      ref={dialogRef}
      onClose={dismiss}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-white/10 bg-[#1a1a1a] p-0 text-white backdrop:bg-black/70"
    >
      {/* Close button */}
      <button
        onClick={dismiss}
        className="absolute top-4 right-4 z-10 cursor-pointer rounded-full p-1 text-white/40 transition-colors hover:text-white/80"
        aria-label="Close"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="p-6">
        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                i <= stepIndex ? "w-8 bg-white/60" : "w-8 bg-white/15"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Email */}
        {step === "email" && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold">Welcome to Pole to Paddock</h2>
              <p className="mt-1 text-sm text-white/50">
                Get race alerts and updates straight to your inbox.
              </p>
            </div>
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleEmailContinue();
                  }
                }}
              />
              {emailError && (
                <p className="mt-1 text-xs text-red-400">{emailError}</p>
              )}
            </div>
            <button
              onClick={handleEmailContinue}
              disabled={submittingEmail}
              className="w-full cursor-pointer rounded-lg bg-white/10 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-50"
            >
              {submittingEmail ? "..." : "Continue"}
            </button>
          </div>
        )}

        {/* Step 2: Team */}
        {step === "team" && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold">Pick Your Team</h2>
              <p className="mt-1 text-sm text-white/50">
                Your team will appear first across the site.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-1 sm:grid-cols-3">
              {welcomeTeams.map((team) => {
                const slug = extractSlug(team.logoUrl, "logos");
                const blur = slug ? getBlurPlaceholder(`logos/${slug}`) : undefined;
                const isSelected = selectedTeam === team.id;
                return (
                  <button
                    key={team.id}
                    onClick={() =>
                      setSelectedTeam(isSelected ? null : team.id)
                    }
                    className={`cursor-pointer flex flex-col items-center gap-2 rounded-lg border p-3 transition-all ${
                      isSelected
                        ? "border-white/40 bg-white/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}
                  >
                    {slug ? (
                      <Image
                        src={logoSrc(slug, 48)}
                        alt={team.name}
                        width={32}
                        height={32}
                        className="h-8 w-auto object-contain"
                        placeholder={blur ? "blur" : undefined}
                        blurDataURL={blur}
                      />
                    ) : (
                      <div
                        className="h-8 w-8 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                    )}
                    <span className="text-xs font-medium text-white/70 text-center leading-tight">
                      {team.name}
                    </span>
                    {isSelected && (
                      <div
                        className="h-1 w-6 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleTeamContinue}
              className="w-full cursor-pointer rounded-lg bg-white/10 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 3: Drivers */}
        {step === "drivers" && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold">Pick Your Drivers</h2>
              <p className="mt-1 text-sm text-white/50">
                Choose up to 2 favorites to highlight across the site.
              </p>
            </div>
            <div className="max-h-[50vh] space-y-1 overflow-y-auto pr-1">
              {welcomeTeams.map((team) =>
                team.drivers.map((driver) => {
                  const isSelected = favoriteDriverIds.includes(driver.id);
                  const atMax =
                    favoriteDriverIds.length >= 2 && !isSelected;
                  const slug = extractSlug(driver.headshotUrl, "drivers");
                  const blur = slug
                    ? getBlurPlaceholder(`drivers/${slug}`)
                    : undefined;
                  return (
                    <button
                      key={driver.id}
                      onClick={() => {
                        if (!atMax || isSelected) {
                          toggleFavoriteDriver(driver.id);
                        }
                      }}
                      disabled={atMax}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                        isSelected
                          ? "border-white/30 bg-white/10"
                          : atMax
                            ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-40"
                            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                      }`}
                    >
                      {/* Team color dot */}
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />

                      {/* Headshot */}
                      {slug ? (
                        <Image
                          src={driverSrc(slug, 48)}
                          alt={driver.name}
                          width={28}
                          height={28}
                          className="h-7 w-7 shrink-0 rounded-full object-cover"
                          placeholder={blur ? "blur" : undefined}
                          blurDataURL={blur}
                        />
                      ) : (
                        <div className="h-7 w-7 shrink-0 rounded-full bg-white/10" />
                      )}

                      <span className="flex-1 text-sm font-medium text-white/80">
                        {driver.name}
                      </span>

                      {/* Checkbox */}
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                          isSelected
                            ? "border-white/50 bg-white/20"
                            : "border-white/20 bg-transparent"
                        }`}
                      >
                        {isSelected && (
                          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                }),
              )}
            </div>
            <button
              onClick={handleDone}
              className="w-full cursor-pointer rounded-lg bg-white/10 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
