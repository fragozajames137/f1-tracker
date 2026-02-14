import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import RaceHub from "@/app/components/race/RaceHub";
import { getSessionsByYear } from "@/app/lib/db-queries";
import { determineRaceState } from "@/app/lib/race-utils";
import type { Race, JolpicaResponse } from "@/app/types";

interface RacePageProps {
  params: Promise<{ year: string; round: string }>;
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

export async function generateMetadata({ params }: RacePageProps): Promise<Metadata> {
  const { year, round } = await params;
  const race = await fetchRaceInfo(parseInt(year), parseInt(round));
  const title = race
    ? `${race.raceName} ${year} — Race Hub`
    : `Round ${round} ${year} — Race Hub`;

  return {
    title,
    description: race
      ? `Pre-race info, live timing, and post-race analysis for the ${race.raceName} at ${race.Circuit.circuitName}.`
      : `Race Hub for Round ${round} of the ${year} Formula 1 season.`,
  };
}

export default async function RacePage({ params }: RacePageProps) {
  const { year: yearParam, round: roundParam } = await params;
  const year = parseInt(yearParam, 10);
  const round = parseInt(roundParam, 10);

  const [race, allSessions] = await Promise.all([
    fetchRaceInfo(year, round),
    getSessionsByYear(year, undefined, round),
  ]);

  // Filter out pre-season testing sessions — they can share a round number
  // with the first GP. Only keep sessions from the GP meeting.
  const sessions = allSessions.filter(
    (s) => !s.meetingName.toLowerCase().includes("testing"),
  );

  const raceState = determineRaceState(race, sessions);

  return (
    <div className="flex min-h-screen flex-col">
      <Header season={year} />
      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <RaceHub
          year={year}
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
