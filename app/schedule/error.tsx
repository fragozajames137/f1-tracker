"use client";

import Header from "@/app/components/Header";
import ErrorFallback from "@/app/components/ErrorFallback";

export default function ScheduleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header season={2026} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6">
        <ErrorFallback
          title="Failed to load race schedule"
          message="The race calendar couldn't be loaded. The data source may be temporarily unavailable."
          error={error}
          reset={reset}
        />
      </main>
    </div>
  );
}
