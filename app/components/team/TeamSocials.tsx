import type { Team } from "@/app/types";

interface TeamSocialsProps {
  team: Team;
  accentColor: string;
}

function SocialLink({
  href,
  label,
  icon,
  accentColor,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  accentColor: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10"
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${accentColor}15` }}
      >
        {icon}
      </div>
      <span className="text-sm font-medium text-white">{label}</span>
      <svg
        className="ml-auto h-3.5 w-3.5 shrink-0 text-white/20"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"
        />
      </svg>
    </a>
  );
}

export default function TeamSocials({ team, accentColor }: TeamSocialsProps) {
  const hasAny = team.website || team.twitter || team.instagram;
  if (!hasAny) return null;

  return (
    <div>
      <h2
        className="mb-3 text-xs font-semibold uppercase tracking-wider"
        style={{ color: `${accentColor}99` }}
      >
        Follow {team.name}
      </h2>

      <div className="grid gap-2 sm:grid-cols-3">
        {team.website && (
          <SocialLink
            href={team.website}
            label="Official Site"
            accentColor={accentColor}
            icon={
              <svg className="h-4.5 w-4.5" style={{ color: accentColor }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A8.966 8.966 0 013 12c0-1.264.26-2.467.73-3.56" />
              </svg>
            }
          />
        )}

        {team.twitter && (
          <SocialLink
            href={`https://x.com/${team.twitter}`}
            label={`@${team.twitter}`}
            accentColor={accentColor}
            icon={
              <svg className="h-4 w-4" style={{ color: accentColor }} viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            }
          />
        )}

        {team.instagram && (
          <SocialLink
            href={`https://instagram.com/${team.instagram}`}
            label={`@${team.instagram}`}
            accentColor={accentColor}
            icon={
              <svg className="h-4.5 w-4.5" style={{ color: accentColor }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            }
          />
        )}
      </div>
    </div>
  );
}
