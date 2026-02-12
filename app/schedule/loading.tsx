import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

export default function ScheduleLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header season={2026} />

      <main id="main-content" aria-busy="true" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <div role="status" className="sr-only">Loading...</div>

        <div className="mb-6 h-7 w-48 animate-pulse rounded bg-white/10" />

        <div className="space-y-3">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-4 w-8 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-4 animate-pulse rounded bg-white/10" />
                <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
              </div>
              <div className="mt-2 h-4 w-64 animate-pulse rounded bg-white/5" />
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
