import Link from "next/link";
import NavLink from "./NavLink";

interface HeaderProps {
  season: number;
  isHome?: boolean;
}

export default function Header({ season, isHome }: HeaderProps) {
  const brandClassName = "font-sans text-2xl font-bold uppercase tracking-widest text-white sm:text-3xl";

  return (
    <header className="border-b border-white/10 bg-white/[0.02]">
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-0 sm:px-6 lg:px-8">
        <div className="text-center">
          {isHome ? (
            <h1 className={brandClassName}>Pole to Paddock</h1>
          ) : (
            <p className={brandClassName}>
              <Link href="/" className="hover:text-white/80 transition-colors">
                Pole to Paddock
              </Link>
            </p>
          )}
        </div>
        <nav className="-mb-px mt-4 flex justify-center overflow-x-auto scrollbar-none">
          <NavLink href="/">Grid</NavLink>
          <NavLink href="/silly-season">Silly Season</NavLink>
          <NavLink href="/schedule">Schedule</NavLink>
          <NavLink href="/race">Race Hub</NavLink>
          <NavLink href="/telemetry">Telemetry</NavLink>
          <NavLink href="/compare">H2H</NavLink>
          <NavLink href="/predict">Predict</NavLink>
          <NavLink href="/penalties">Penalties</NavLink>
          <NavLink href="/fan-favorites">Fan Favorites</NavLink>
          <NavLink href="/history">History</NavLink>
        </nav>
      </div>
    </header>
  );
}
