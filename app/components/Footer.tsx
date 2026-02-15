import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-4 py-6 text-center text-xs text-white/30 sm:px-6">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <a href="#" className="hover:text-white/50 transition-colors">X</a>
        <span className="text-white/10">&middot;</span>
        <a href="mailto:hello@poletopaddock.com" className="hover:text-white/50 transition-colors">Contact</a>
        <span className="text-white/10">&middot;</span>
        <Link href="/about" className="hover:text-white/50 transition-colors">About</Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span>&copy; 2026 Pole to Paddock</span>
        <span className="text-white/10">&middot;</span>
        <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy Policy</Link>
        <span className="text-white/10">&middot;</span>
        <Link href="/terms" className="hover:text-white/50 transition-colors">Terms of Service</Link>
      </div>

      <p className="mt-3 text-white/10">
        Unofficial and unaffiliated with Formula 1, FOM, or FIA. F1 trademarks
        belong to Formula One Licensing B.V. Images used under editorial fair use.
      </p>
    </footer>
  );
}
