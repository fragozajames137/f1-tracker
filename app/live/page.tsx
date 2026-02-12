import type { Metadata } from "next";
import Header from "@/app/components/Header";
import LiveDashboard from "@/app/components/live/LiveDashboard";

export const metadata: Metadata = {
  title: "Live Race Dashboard",
  description:
    "Real-time F1 race positions, lap times, pit stops, tire strategy, weather, and race control updates powered by OpenF1.",
  alternates: { canonical: "/live" },
  openGraph: {
    title: "Live F1 Race Dashboard — Pole to Paddock",
    description:
      "Real-time F1 race positions, lap times, pit stops, and race control updates.",
    url: "/live",
  },
};

function LiveJsonLd() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://poletopaddock.com";

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Pole to Paddock Live Dashboard",
    url: `${siteUrl}/live`,
    applicationCategory: "SportsApplication",
    operatingSystem: "Any",
    description:
      "Real-time Formula 1 race dashboard with live positions, lap times, pit stops, weather, and race control messages.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Live driver positions",
      "Real-time lap times",
      "Pit stop tracking",
      "Tire compound strategy",
      "Race control messages",
      "Weather conditions",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function LivePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LiveJsonLd />
      <Header season={2026} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-display mb-6 text-xl font-bold text-white">
          Live Race Dashboard
        </h1>
        <LiveDashboard />
      </main>

      <footer className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/20 sm:px-6">
        Pole to Paddock &mdash; Live data powered by OpenF1
      </footer>
    </div>
  );
}
