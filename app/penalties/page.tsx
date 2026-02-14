import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import PenaltyTracker from "@/app/components/penalties/PenaltyTracker";
import { getDriverSummaries, getIncidents, getConsistencyGroups } from "@/app/lib/penalties";

export const metadata: Metadata = {
  title: "Penalty Points Tracker — Pole to Paddock",
  description:
    "Track every F1 driver's penalty points, incident history, race ban proximity, and steward consistency analysis.",
  alternates: { canonical: "/penalties" },
  openGraph: {
    title: "F1 Penalty Points Tracker",
    description:
      "Active penalty points, incident history, and stewarding consistency analysis for the 2025–26 F1 season.",
    url: "/penalties",
  },
};

export default function PenaltiesPage() {
  const summaries = getDriverSummaries();
  const incidents = getIncidents();
  const consistencyGroups = getConsistencyGroups();

  return (
    <div className="flex min-h-screen flex-col">
      <Header season={2026} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-white mb-2">
          Penalty Points Tracker
        </h1>
        <p className="text-sm text-white/50 mb-8">
          Active penalty points, incident history, and stewarding consistency for the
          2025–26 season. Points expire on a 12-month rolling basis — 12 points
          triggers an automatic one-race ban.
        </p>
        <PenaltyTracker
          summaries={summaries}
          incidents={incidents}
          consistencyGroups={consistencyGroups}
        />
      </main>
      <Footer />
    </div>
  );
}
