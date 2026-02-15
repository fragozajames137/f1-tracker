import Link from "next/link";
import NavLink from "./NavLink";
import SettingsDropdown from "./SettingsDropdown";
import WelcomeModal from "./WelcomeModal";
import gridData from "@/app/data/grid-2026.json";
import type { GridData } from "@/app/types";

const grid = gridData as GridData;

interface HeaderProps {
  season: number;
  isHome?: boolean;
}

export default function Header({ season, isHome }: HeaderProps) {
  const brandClassName = "font-sans text-xl font-bold uppercase tracking-widest text-white sm:text-3xl";

  return (
    <header className="border-b border-white/10 bg-white/[0.02]">
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-0 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center">
          <div className="flex-1" />
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
          <div className="flex flex-1 justify-end">
            <SettingsDropdown teams={grid.teams} />
          </div>
        </div>
        <div className="relative -mb-px mt-4">
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-6 bg-gradient-to-r from-[#111] to-transparent sm:hidden" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-6 bg-gradient-to-l from-[#111] to-transparent sm:hidden" />
          <nav className="flex justify-start overflow-x-auto scrollbar-none sm:justify-center">
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
      </div>
      <WelcomeModal teams={grid.teams} />
    </header>
  );
}
