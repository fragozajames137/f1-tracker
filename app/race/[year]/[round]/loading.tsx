export default function RaceLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header skeleton */}
      <div className="border-b border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
          <div className="mt-3 flex gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 w-16 animate-pulse rounded bg-white/5" />
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Race title skeleton */}
        <div className="mb-6 space-y-3">
          <div className="h-8 w-72 animate-pulse rounded bg-white/10" />
          <div className="h-5 w-96 animate-pulse rounded bg-white/5" />
        </div>

        {/* Tabs skeleton */}
        <div className="mb-6 flex gap-1 rounded-lg border border-white/10 p-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 flex-1 animate-pulse rounded-md bg-white/5" />
          ))}
        </div>

        {/* Content skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg border border-white/10 bg-white/[0.02]"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
