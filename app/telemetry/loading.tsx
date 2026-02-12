import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

export default function TelemetryLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header season={2026} />

      <main id="main-content" aria-busy="true" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div role="status" className="sr-only">Loading...</div>

        <div className="mb-6 h-7 w-48 animate-pulse rounded bg-white/10" />

        {/* Session picker skeleton */}
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="h-10 w-60 animate-pulse rounded-lg bg-white/5 border border-white/10" />
        </div>

        {/* Chart skeleton */}
        <div className="mb-6 h-64 animate-pulse rounded-lg border border-white/10 bg-white/5" />

        {/* Table skeleton */}
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-white/5" />
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
