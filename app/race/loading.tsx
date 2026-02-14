import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

export default function RaceLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header season={2026} />

      <main id="main-content" aria-busy="true" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div role="status" className="sr-only">Loading...</div>

        {/* Race selector skeleton */}
        <div className="mb-6 flex items-center gap-4">
          <div className="h-10 w-56 animate-pulse rounded-lg border border-white/10 bg-white/5" />
        </div>

        {/* Race header skeleton */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="h-5 w-8 animate-pulse rounded bg-white/10" />
            <div className="h-7 w-64 animate-pulse rounded bg-white/10" />
          </div>
          <div className="mt-2 h-4 w-48 animate-pulse rounded bg-white/5" />
        </div>

        {/* Tab bar skeleton */}
        <div className="mb-6 flex rounded-lg border border-white/10 p-1">
          <div className="h-9 flex-1 animate-pulse rounded-md bg-white/5" />
          <div className="h-9 flex-1 animate-pulse rounded-md bg-white/5" />
          <div className="h-9 flex-1 animate-pulse rounded-md bg-white/5" />
        </div>

        {/* Content skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-white/10 bg-white/5" />
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
