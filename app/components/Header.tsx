import Link from "next/link";
import NavLink from "./NavLink";

interface HeaderProps {
  season: number;
  isHome?: boolean;
}

export default function Header({ season, isHome }: HeaderProps) {
  const brandClassName = "font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl";

  return (
    <header className="border-b border-white/10 bg-white/[0.02]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            {isHome ? (
              <h1 className={brandClassName}>Pole to Paddock</h1>
            ) : (
              <p className={brandClassName}>
                <Link href="/" className="hover:text-white/80 transition-colors">
                  Pole to Paddock
                </Link>
              </p>
            )}
            <nav className="mt-3 flex gap-3 sm:gap-4">
              <NavLink href="/">Grid</NavLink>
              <NavLink href="/schedule">Schedule</NavLink>
              <NavLink href="/live">Live</NavLink>
              <NavLink href="/telemetry">Telemetry</NavLink>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
