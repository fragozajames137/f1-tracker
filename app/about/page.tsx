import type { Metadata } from "next";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

export const metadata: Metadata = {
  title: "About",
  description: "About Pole to Paddock — an independent Formula 1 data tracker and fan resource.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header season={2026} />

      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="font-display mb-6 text-2xl font-bold text-white">About Pole to Paddock</h1>

        <div className="space-y-6 text-sm leading-relaxed text-white/60">
          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">What We Do</h2>
            <p>
              Pole to Paddock is an independent Formula 1 resource built for fans who want
              more than just headlines. We track the full 2026 grid, contract statuses,
              silly season rumors, race telemetry, and historical statistics — all in
              one place.
            </p>
            <p className="mt-2">
              Whether you want to check session times in your local timezone, compare
              driver telemetry lap-by-lap, or dig into decades of race history, this site
              is designed to make that easy and fast.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">Data Sources</h2>
            <p>
              Race schedules, standings, and historical results come from the{" "}
              <a href="https://api.jolpi.ca/ergast/f1/" className="text-white/70 underline hover:text-white" target="_blank" rel="noopener noreferrer">
                Jolpica API
              </a>{" "}
              (community continuation of the Ergast database). Session and telemetry
              data are sourced from the{" "}
              <a href="https://openf1.org" className="text-white/70 underline hover:text-white" target="_blank" rel="noopener noreferrer">
                OpenF1 API
              </a>
              . Contract and salary information is compiled from public reporting by
              major motorsport outlets.
            </p>
            <p className="mt-2">
              We do our best to keep data accurate, but data sources can have gaps and
              contract details change fast. Nothing on this site should be treated as an
              official source.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">Built With</h2>
            <p>
              Pole to Paddock is a Next.js application using React, TypeScript, and
              Tailwind CSS. The codebase is open for anyone curious about how it works.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-white/80">Disclaimer</h2>
            <p>
              This website is unofficial and is not associated in any way with the
              Formula 1 companies. F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD
              CHAMPIONSHIP, GRAND PRIX and related marks are trade marks of Formula One
              Licensing B.V. All team names, logos, and driver images are the property of
              their respective owners and are used here under editorial fair use for fan
              commentary and analysis.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
