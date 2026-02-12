"use client";

import ErrorFallback from "@/app/components/ErrorFallback";

export default function LiveError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      title="Failed to load live data"
      message="The live dashboard couldn't be loaded. Please check your connection and try again."
      error={error}
      reset={reset}
      showShell
    />
  );
}
