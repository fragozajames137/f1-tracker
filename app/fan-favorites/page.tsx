import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import FanFavoritesTracker from "@/app/components/fan-favorites/FanFavoritesTracker";
import { getDOTDLeaderboard, getDOTDHighlights, getDOTDSeason } from "@/app/lib/dotd";

export const metadata: Metadata = {
  title: "Fan Favorites — Pole to Paddock",
  description:
    "2025 F1 Driver of the Day voting results. See the season leaderboard, race-by-race breakdowns, and voting trends.",
  alternates: { canonical: "/fan-favorites" },
  openGraph: {
    title: "Fan Favorites — Pole to Paddock",
    description:
      "2025 F1 Driver of the Day voting results and season leaderboard.",
    url: "/fan-favorites",
  },
};

export default function FanFavoritesPage() {
  const leaderboard = getDOTDLeaderboard();
  const highlights = getDOTDHighlights();
  const season = getDOTDSeason();

  return (
    <div className="flex min-h-screen flex-col">
      <Header season={2026} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-white mb-2">
          Fan Favorites
        </h1>
        <p className="text-sm text-white/50 mb-8">
          2025 Driver of the Day voting results across {season.races.length} races.
          Millions of fans vote during each Grand Prix — here&apos;s who they chose.
        </p>

        <FanFavoritesTracker
          leaderboard={leaderboard}
          highlights={highlights}
          races={season.races}
        />
      </main>

      <Footer />
    </div>
  );
}
