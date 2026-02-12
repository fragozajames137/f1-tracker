import type { Metadata } from "next";
import Header from "@/app/components/Header";
import TelemetryDashboard from "@/app/components/telemetry/TelemetryDashboard";
import { listTelemetryFiles, loadTelemetrySession } from "@/app/lib/telemetry";

export const metadata: Metadata = {
  title: "Telemetry Analysis",
  description:
    "Historical Formula 1 telemetry data: speed traces, lap time charts, and tire strategy analysis powered by FastF1.",
  alternates: { canonical: "/telemetry" },
  openGraph: {
    title: "F1 Telemetry Analysis — Pole to Paddock",
    description:
      "Historical F1 telemetry data: speed traces, lap times, and tire strategy analysis.",
    url: "/telemetry",
  },
};

function TelemetryJsonLd() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://poletopaddock.com";

  const schema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Formula 1 Telemetry Data",
    description:
      "Historical Formula 1 telemetry including speed traces, lap times, sector times, and tire strategy data for completed Grand Prix races.",
    url: `${siteUrl}/telemetry`,
    license: "https://creativecommons.org/licenses/by-nc/4.0/",
    creator: {
      "@type": "Organization",
      name: "Pole to Paddock",
      url: siteUrl,
    },
    temporalCoverage: "2023/..",
    keywords: [
      "Formula 1",
      "F1 telemetry",
      "speed trace",
      "lap times",
      "tire strategy",
      "FastF1",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default async function TelemetryPage() {
  const files = await listTelemetryFiles();
  const initialSession =
    files.length > 0 ? await loadTelemetrySession(files[0].filename) : null;

  return (
    <div className="flex min-h-screen flex-col">
      <TelemetryJsonLd />
      <Header season={2026} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-display mb-6 text-xl font-bold text-white">
          Telemetry Analysis
        </h1>
        <TelemetryDashboard files={files} initialSession={initialSession} />
      </main>

      <footer className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/20 sm:px-6">
        Pole to Paddock &mdash; Telemetry powered by FastF1
      </footer>
    </div>
  );
}
