"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4 text-center">
      <p className="font-display text-5xl font-bold text-red-500/20">Error</p>
      <h1 className="font-display mt-4 text-xl font-semibold text-white">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-white/40">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      {error.digest && (
        <p className="mt-1 font-mono text-xs text-white/20">
          ID: {error.digest}
        </p>
      )}
      <div className="mt-8 flex gap-3">
        <button
          onClick={reset}
          className="cursor-pointer rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:border-white/20 hover:text-white"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
