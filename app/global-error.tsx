"use client";

import { useEffect, useRef } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") reset();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [reset]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0a0a] text-white antialiased">
        <div
          ref={containerRef}
          role="alert"
          aria-live="assertive"
          tabIndex={-1}
          className="flex min-h-screen flex-col items-center justify-center px-4 text-center outline-none"
        >
          <p aria-hidden="true" className="text-5xl font-bold text-red-500/20">Error</p>
          <h1 className="mt-4 text-xl font-semibold text-white">
            Something went wrong
          </h1>
          <p className="mt-2 max-w-md text-sm text-white/40">
            {error.message || "A critical error occurred. Please try reloading."}
          </p>
          {error.digest && (
            <p className="mt-1 font-mono text-xs text-white/20">
              ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="mt-8 cursor-pointer rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
