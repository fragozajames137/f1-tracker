import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import SillySeasonTracker from "@/app/components/silly-season/SillySeasonTracker";
import gridData from "@/app/data/grid-2026.json";
import { GridData } from "@/app/types";

const data = gridData as GridData;

export const metadata: Metadata = {
  title: "Silly Season Tracker — Pole to Paddock",
  description:
    "Track every F1 driver rumor, contract expiry, and seat swap for the 2026 season. Timeline and grid views.",
  alternates: { canonical: "/silly-season" },
  openGraph: {
    title: "F1 Silly Season Tracker — Pole to Paddock",
    description:
      "Every F1 driver rumor, contract status, and seat swap for 2026.",
    url: "/silly-season",
  },
};

export default function SillySeasonPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header season={data.season} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-white mb-2">
          Silly Season Tracker
        </h1>
        <p className="text-sm text-white/50 mb-8">
          Rumors, contract status, and seat swaps for the {data.season} season.
        </p>
        <SillySeasonTracker data={data} />
      </main>
      <Footer />
    </div>
  );
}
