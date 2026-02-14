import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import RaceSchedule from "@/app/components/RaceSchedule";
import { fetchRaceSchedule } from "@/app/lib/schedule";
import {
  getCircuitByName,
  getContractByRaceName,
  getHostNation,
} from "@/app/lib/schedule-data";
import type { Race } from "@/app/types";
import type { RaceEnrichment } from "@/app/components/RaceCard";

export const metadata: Metadata = {
  title: "2026 Race Schedule",
  description:
    "Full 2026 Formula 1 race calendar with all 24 Grand Prix dates, circuits, and session times in your local timezone.",
  alternates: { canonical: "/schedule" },
  openGraph: {
    title: "2026 F1 Race Schedule — Pole to Paddock",
    description:
      "Full 2026 Formula 1 race calendar with session times in your local timezone.",
    url: "/schedule",
  },
};

function ScheduleJsonLd({ races }: { races: Race[] }) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://poletopaddock.com";

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "2026 Formula 1 Race Schedule",
    numberOfItems: races.length,
    itemListElement: races.map((race, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "SportsEvent",
        name: race.raceName,
        startDate: race.date,
        location: {
          "@type": "Place",
          name: race.Circuit.circuitName,
          address: {
            "@type": "PostalAddress",
            addressLocality: race.Circuit.Location.locality,
            addressCountry: race.Circuit.Location.country,
          },
          geo: {
            "@type": "GeoCoordinates",
            latitude: race.Circuit.Location.lat,
            longitude: race.Circuit.Location.long,
          },
        },
        url: `${siteUrl}/schedule`,
        sport: "Formula 1",
        competitor: { "@type": "SportsOrganization", name: "Formula 1" },
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

function buildEnrichments(races: Race[]): Record<string, RaceEnrichment> {
  const map: Record<string, RaceEnrichment> = {};

  for (const race of races) {
    const circuit = getCircuitByName(race.Circuit.circuitName);
    const contract = getContractByRaceName(race.raceName);
    const nation = getHostNation(race.Circuit.Location.country);

    map[race.round] = {
      circuitRaces: circuit?.totalRaces ?? null,
      contractEnd: contract?.contractEnds ?? circuit?.contractedUntil ?? null,
      hostNationRaces: nation?.totalRaces ?? null,
      hostNationCircuits: nation?.circuitsUsed ?? null,
    };
  }

  return map;
}

export default async function SchedulePage() {
  const races = await fetchRaceSchedule();
  const enrichments = buildEnrichments(races);

  return (
    <div className="flex min-h-screen flex-col">
      <ScheduleJsonLd races={races} />
      <Header season={2026} />

      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="font-display mb-6 text-2xl font-bold text-white">
          2026 Race Schedule
        </h1>
        <RaceSchedule races={races} enrichments={enrichments} />
      </main>

      <Footer />
    </div>
  );
}
