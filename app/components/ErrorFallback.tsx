"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Header from "./Header";

interface ErrorFallbackProps {
  title?: string;
  message?: string;
  error?: Error & { digest?: string };
  reset?: () => void;
  showShell?: boolean;
  maxWidth?: string;
}

export default function ErrorFallback({
  title = "Something went wrong",
  message,
  error,
  reset,
  showShell = false,
  maxWidth = "max-w-7xl",
}: ErrorFallbackProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!reset) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") reset!();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [reset]);

  const content = (
    <div
      ref={containerRef}
      role="alert"
      aria-live="assertive"
      tabIndex={-1}
      className="flex min-h-[400px] flex-col items-center justify-center px-4 py-16 text-center outline-none"
    >
      <p aria-hidden="true" className="font-display text-5xl font-bold text-red-500/20">Error</p>
      <h2 className="font-display mt-4 text-lg font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-white/40">
        {message || error?.message || "An unexpected error occurred."}
      </p>
      {error?.digest && (
        <p className="mt-1 font-mono text-xs text-white/20">
          ID: {error.digest}
        </p>
      )}
      <div className="mt-6 flex gap-3" role="group" aria-label="Error recovery actions">
        {reset && (
          <button
            onClick={reset}
            className="cursor-pointer rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            Try again
          </button>
        )}
        <Link
          href="/"
          className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:border-white/20 hover:text-white"
        >
          Go home
        </Link>
      </div>
    </div>
  );

  if (!showShell) return content;

  return (
    <div className="flex min-h-screen flex-col">
      <Header season={2026} />
      <main id="main-content" className={`mx-auto w-full ${maxWidth} flex-1 px-4 sm:px-6 lg:px-8`}>
        {content}
      </main>
    </div>
  );
}
