"use client";

import Header from "@/app/components/Header";
import ErrorFallback from "@/app/components/ErrorFallback";

export default function TelemetryError({
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
          title="Failed to load telemetry"
          message="Telemetry data couldn't be loaded. The data files may not be available yet."
          error={error}
          reset={reset}
        />
      </main>
    </div>
  );
}
