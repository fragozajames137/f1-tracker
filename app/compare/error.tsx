"use client";

import ErrorFallback from "@/app/components/ErrorFallback";

export default function CompareError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      title="Failed to load comparison data"
      message="The driver comparison couldn't be loaded. The telemetry data may be temporarily unavailable."
      error={error}
      reset={reset}
      showShell
      maxWidth="max-w-3xl"
    />
  );
}
