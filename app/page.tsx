import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import SeatMap from "@/app/components/SeatMap";
import gridData from "@/app/data/grid-2026.json";
import { GridData } from "@/app/types";

const data = gridData as GridData;

export const metadata: Metadata = {
  title: "Pole to Paddock — 2026 F1 Driver Grid",
  description:
    "The complete 2026 Formula 1 driver grid. See all 11 teams, 22 drivers, contract status, and team lineups at a glance.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Pole to Paddock — 2026 F1 Driver Grid",
    description:
      "The complete 2026 Formula 1 driver grid with contract status for all 11 teams.",
    url: "/",
  },
};

function JsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "Pole to Paddock",
        url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://poletopaddock.com",
        description:
          "The complete 2026 Formula 1 driver grid with contract status for all 11 teams.",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://poletopaddock.com"}/?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "SportsOrganization",
        name: "Formula 1",
        sport: "Motorsport",
        url: "https://www.formula1.com",
      },
      {
        "@type": "CollectionPage",
        name: "2026 F1 Driver Grid",
        description:
          "Complete 2026 Formula 1 driver lineup with contract status for all 11 teams and 22 seats.",
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: data.teams.length,
          itemListElement: data.teams.map((team, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: team.name,
          })),
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd />
      <Header season={data.season} isHome />

      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-display mb-6 text-2xl font-bold text-white">
          2026 F1 Driver Grid
        </h1>
        <SeatMap data={data} />
      </main>

      <Footer />
    </div>
  );
}
