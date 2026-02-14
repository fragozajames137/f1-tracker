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
      className={`block py-2.5 text-center text-sm font-medium transition-colors ${
        isActive
          ? "border-b-2 border-red-500 text-white"
          : "border-b-2 border-transparent text-white/50 hover:text-white hover:border-white/20"
      }`}
    >
      {children}
    </Link>
  );
}
