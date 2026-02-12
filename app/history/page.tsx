import type { Metadata } from "next";
import Header from "@/app/components/Header";
import HistoryDashboard from "@/app/components/history/HistoryDashboard";
import { fetchHistoryData, fetchAvailableSeasons } from "@/app/lib/history";

export const metadata: Metadata = {
  title: "Historical Standings & Results",
  description:
    "Browse every Formula 1 season from 1950 to today: driver and constructor standings, full race results, and circuit details.",
  alternates: { canonical: "/history" },
  openGraph: {
    title: "F1 Historical Standings & Results — Pole to Paddock",
    description:
      "Every F1 season from 1950 to today: standings, race results, and more.",
    url: "/history",
  },
};

function HistoryJsonLd() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://poletopaddock.com";

  const schema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Formula 1 Historical Standings & Results",
    description:
      "Complete Formula 1 historical data from 1950 to present, including driver and constructor championship standings and full race results for every Grand Prix.",
    url: `${siteUrl}/history`,
    license: "https://creativecommons.org/licenses/by-nc/4.0/",
    creator: {
      "@type": "Organization",
      name: "Pole to Paddock",
      url: siteUrl,
    },
    temporalCoverage: "1950/..",
    keywords: [
      "Formula 1",
      "F1 history",
      "driver standings",
      "constructor standings",
      "race results",
      "Grand Prix",
      "championship",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

const DEFAULT_SEASON = 2025;

export default async function HistoryPage() {
  const [initialData, seasons] = await Promise.all([
    fetchHistoryData(DEFAULT_SEASON),
    fetchAvailableSeasons(),
  ]);

  // Ensure default season is in the list
  const allSeasons =
    seasons.length > 0 ? seasons : [DEFAULT_SEASON];

  return (
    <div className="flex min-h-screen flex-col">
      <HistoryJsonLd />
      <Header season={2026} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-display mb-6 text-xl font-bold text-white">
          Historical Standings &amp; Results
        </h1>
        <HistoryDashboard seasons={allSeasons} initialData={initialData} />
      </main>

      <footer className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/20 sm:px-6">
        Pole to Paddock &mdash; Data via Jolpica (Ergast) API
      </footer>
    </div>
  );
}
