import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import RaceHub from "@/app/components/race/RaceHub";
import RaceSelector from "@/app/components/race/RaceSelector";
import { fetchRaceSchedule } from "@/app/lib/schedule";
import { getSessionsByYear } from "@/app/lib/db-queries";
import { determineRaceState, findCurrentRace } from "@/app/lib/race-utils";
import type { Race, JolpicaResponse } from "@/app/types";

interface RacePageProps {
  searchParams: Promise<{ round?: string }>;
}

async function fetchRaceInfo(year: number, round: number): Promise<Race | null> {
  try {
    const res = await fetch(
      `https://api.jolpi.ca/ergast/f1/${year}/${round}.json`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const data: JolpicaResponse = await res.json();
    return data.MRData.RaceTable.Races[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ searchParams }: RacePageProps): Promise<Metadata> {
  const { round: roundParam } = await searchParams;

  if (roundParam) {
    const race = await fetchRaceInfo(2026, parseInt(roundParam));
    return {
      title: race ? `${race.raceName} 2026 — Race Hub` : `Round ${roundParam} 2026 — Race Hub`,
      description: race
        ? `Pre-race info, live timing, and post-race analysis for the ${race.raceName} at ${race.Circuit.circuitName}.`
        : `Race Hub for Round ${roundParam} of the 2026 Formula 1 season.`,
    };
  }

  return {
    title: "Race Hub — Pole to Paddock",
    description: "Live timing, pre-session info, and post-race analysis for the 2026 Formula 1 season.",
  };
}

export default async function RaceLandingPage({ searchParams }: RacePageProps) {
  const { round: roundParam } = await searchParams;
  const races = await fetchRaceSchedule();

  // Determine which round to show
  let round: number;
  if (roundParam) {
    round = parseInt(roundParam, 10);
  } else {
    const current = findCurrentRace(races);
    round = current ? parseInt(current.race.round, 10) : 1;
  }

  const [race, allSessions] = await Promise.all([
    fetchRaceInfo(2026, round),
    getSessionsByYear(2026, undefined, round),
  ]);

  // Filter out pre-season testing sessions
  const sessions = allSessions.filter(
    (s) => !s.meetingName.toLowerCase().includes("testing"),
  );

  const raceState = determineRaceState(race, sessions);

  return (
    <div className="flex min-h-screen flex-col">
      <Header season={2026} />
      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-4">
          <RaceSelector races={races} currentRound={round} />
        </div>
        <RaceHub
          year={2026}
          round={round}
          race={race}
          sessions={sessions}
          initialState={raceState}
        />
      </main>
      <Footer />
    </div>
  );
}
