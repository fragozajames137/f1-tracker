import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import CompareDashboard from "@/app/components/compare/CompareDashboard";
import { listTelemetryFiles, loadTelemetrySession } from "@/app/lib/telemetry";

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

  return (
    <div className="flex min-h-screen flex-col">
      <Header season={2026} />

      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-display mb-6 text-xl font-bold text-white">
          Head-to-Head Comparison
        </h1>
        <CompareDashboard files={files} initialSession={initialSession} />
      </main>

      <Footer />
    </div>
  );
}
