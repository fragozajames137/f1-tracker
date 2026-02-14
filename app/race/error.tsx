"use client";

import ErrorFallback from "@/app/components/ErrorFallback";

export default function RaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      title="Failed to load Race Hub"
      message="The Race Hub couldn't be loaded. Please check your connection and try again."
      error={error}
      reset={reset}
      showShell
    />
  );
}
