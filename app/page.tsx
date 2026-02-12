import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import SeatMap from "@/app/components/SeatMap";
import gridData from "@/app/data/grid-2026.json";
import { GridData } from "@/app/types";

const data = gridData as GridData;

export const metadata: Metadata = {
  title: "Pole to Paddock — F1 Silly Season Tracker",
  description:
    "Track every F1 driver contract, seat swap, and rumor for the 2026 season. See which seats are locked, expiring, and open across all 11 teams.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Pole to Paddock — F1 Silly Season Tracker",
    description:
      "Track every F1 driver contract, seat swap, and rumor for the 2026 season.",
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
          "Track every F1 driver contract, seat swap, and rumor for the 2026 season.",
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
        <div role="list" aria-label="Contract status legend" className="mb-6 flex flex-wrap items-center gap-4 text-sm text-white/40">
          <span role="listitem" className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-green-500" />
            Locked
          </span>
          <span role="listitem" className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
            Expiring
          </span>
          <span role="listitem" className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-red-500" />
            Open
          </span>
          <span className="ml-auto text-xs text-white/30">
            Last Updated:{" "}
            {new Date(data.lastUpdated + "T00:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        <SeatMap data={data} />
      </main>

      <Footer />
    </div>
  );
}
