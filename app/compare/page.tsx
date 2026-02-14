import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import ComparePageTabs from "@/app/components/compare/ComparePageTabs";
import { listTelemetryFiles, loadTelemetrySession } from "@/app/lib/telemetry";
import { getGrid, getHistoricalDriver } from "@/app/lib/grid-data";
import type { F1HistoricalDriver } from "@/app/types/f1-reference";

export const metadata: Metadata = {
  title: "Head-to-Head",
  description:
    "Compare two Formula 1 drivers head-to-head: lap times, sector deltas, race pace, and strategy across any Grand Prix.",
  alternates: { canonical: "/compare" },
  openGraph: {
    title: "H2H Driver Comparison — Pole to Paddock",
    description:
      "Head-to-head F1 driver comparison: lap times, sectors, pace, and tire strategy.",
    url: "/compare",
  },
};

export default async function ComparePage() {
  const files = await listTelemetryFiles();
  const initialSession =
    files.length > 0 ? await loadTelemetrySession(files[0].filename) : null;

  const grid = getGrid();

  const gridDrivers = grid.teams.flatMap((team) =>
    [team.seat1, team.seat2].map((d) => ({
      id: d.id,
      name: d.name,
      teamColor: team.color,
    })),
  );

  const historicalDrivers: Record<string, F1HistoricalDriver> = {};
  for (const d of gridDrivers) {
    const hist = getHistoricalDriver(d.name);
    if (hist) historicalDrivers[d.name] = hist;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header season={2026} />

      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-display mb-6 text-2xl font-bold text-white">
          Head-to-Head Comparison
        </h1>
        <ComparePageTabs
          files={files}
          initialSession={initialSession}
          gridDrivers={gridDrivers}
          historicalDrivers={historicalDrivers}
        />
      </main>

      <Footer />
    </div>
  );
}
