"use client";

import Header from "@/app/components/Header";
import ErrorFallback from "@/app/components/ErrorFallback";

export default function LiveError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header season={2026} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8">
        <ErrorFallback
          title="Failed to load live data"
          message="The live dashboard couldn't be loaded. Please check your connection and try again."
          error={error}
          reset={reset}
        />
      </main>
    </div>
  );
}
