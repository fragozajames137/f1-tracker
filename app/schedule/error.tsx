"use client";

import ErrorFallback from "@/app/components/ErrorFallback";

export default function ScheduleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      title="Failed to load race schedule"
      message="The race calendar couldn't be loaded. The data source may be temporarily unavailable."
      error={error}
      reset={reset}
      showShell
      maxWidth="max-w-3xl"
    />
  );
}
