"use client";

import ErrorFallback from "@/app/components/ErrorFallback";

export default function TelemetryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      title="Failed to load telemetry"
      message="Telemetry data couldn't be loaded. The data files may not be available yet."
      error={error}
      reset={reset}
      showShell
    />
  );
}
