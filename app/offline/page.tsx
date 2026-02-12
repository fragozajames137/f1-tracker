"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4 text-center">
      <p aria-hidden="true" className="font-display text-6xl font-bold text-white/10">
        Offline
      </p>
      <h1 className="font-display mt-4 text-xl font-semibold text-white">
        You&apos;re offline
      </h1>
      <p className="mt-2 max-w-md text-sm text-white/40">
        It looks like you&apos;ve lost your internet connection. Some content
        may still be available from cache.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-8 cursor-pointer rounded-lg bg-white/10 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
      >
        Try again
      </button>
    </div>
  );
}
