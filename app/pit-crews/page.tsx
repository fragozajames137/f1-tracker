import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import PitCrewLeaderboard from "@/app/components/pit-crews/PitCrewLeaderboard";
import { getPitStopYears } from "@/app/lib/db-queries";

const SEASON = 2026;

export const metadata: Metadata = {
  title: "Pit Crew Rankings — Pole to Paddock",
  description:
    "Season-wide F1 pit crew performance rankings. Compare teams by average stationary time, consistency, and race-by-race trends.",
  alternates: { canonical: "/pit-crews" },
  openGraph: {
    title: "F1 Pit Crew Rankings",
    description:
      "Season-wide F1 pit crew performance rankings with team leaderboards and fastest stops.",
    url: "/pit-crews",
  },
};

export default async function PitCrewsPage() {
  const availableYears = await getPitStopYears();
  // Default to the most recent year with data, or SEASON
  const defaultYear = availableYears[0] ?? SEASON;

  return (
    <div className="flex min-h-screen flex-col">
      <Header season={SEASON} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-display mb-6 text-2xl font-bold text-white">
          Pit Crew Rankings
        </h1>
        <PitCrewLeaderboard year={defaultYear} availableYears={availableYears} />
      </main>
      <Footer />
    </div>
  );
}
