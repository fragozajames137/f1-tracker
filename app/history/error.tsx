"use client";

import ErrorFallback from "@/app/components/ErrorFallback";

export default function HistoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      title="Failed to load history"
      message="Historical data couldn't be loaded. The API may be temporarily unavailable."
      error={error}
      reset={reset}
      showShell
      maxWidth="max-w-7xl"
    />
  );
}
