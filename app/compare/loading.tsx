import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

export default function CompareLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header season={2026} />

      <main id="main-content" aria-busy="true" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div role="status" className="sr-only">Loading...</div>

        <div className="mb-6 h-7 w-56 animate-pulse rounded bg-white/10" />

        {/* Session + driver pickers skeleton */}
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="h-10 w-60 animate-pulse rounded-lg bg-white/5 border border-white/10" />
          <div className="h-10 w-40 animate-pulse rounded-lg bg-white/5 border border-white/10" />
          <div className="h-10 w-40 animate-pulse rounded-lg bg-white/5 border border-white/10" />
        </div>

        {/* Chart skeleton */}
        <div className="mb-6 h-64 animate-pulse rounded-lg border border-white/10 bg-white/5" />

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-white/10 bg-white/5" />
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
