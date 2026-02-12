import Link from "next/link";
import Header from "@/app/components/Header";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header season={2026} />

      <main
        id="main-content"
        role="alert"
        aria-live="polite"
        tabIndex={-1}
        className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center outline-none"
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
      >
        <p aria-hidden="true" className="font-display text-6xl font-bold text-white/10">404</p>
        <h1 className="font-display mt-4 text-xl font-semibold text-white">
          Page not found
        </h1>
        <p className="mt-2 max-w-md text-sm text-white/40">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8 flex gap-3" role="group" aria-label="Navigation options">
          <Link
            href="/"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            Driver Grid
          </Link>
          <Link
            href="/schedule"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:border-white/20 hover:text-white"
          >
            Race Schedule
          </Link>
        </div>
      </main>
    </div>
  );
}
