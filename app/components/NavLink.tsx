"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

export default function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`block shrink-0 px-3 py-2.5 text-center text-xs font-medium transition-colors sm:text-sm ${
        isActive
          ? "border-b-2 border-red-500 text-white"
          : "border-b-2 border-transparent text-white/50 hover:text-white hover:border-white/20"
      }`}
    >
      {children}
    </Link>
  );
}
