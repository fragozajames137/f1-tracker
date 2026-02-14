"use client";

interface TwitterFeedProps {
  handle: string;
  teamName: string;
  teamColor: string;
}

export default function TwitterFeed({ handle, teamName, teamColor }: TwitterFeedProps) {
  return (
    <div>
      <h2
        className="mb-3 text-xs font-semibold uppercase tracking-wider"
        style={{ color: `${teamColor}99` }}
      >
        Follow on X
      </h2>

      <a
        href={`https://x.com/${handle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
      >
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${teamColor}20` }}
        >
          <svg className="h-6 w-6" style={{ color: teamColor }} viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">{teamName}</p>
          <p className="text-xs text-white/40">@{handle}</p>
        </div>
        <svg className="h-4 w-4 shrink-0 text-white/20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
        </svg>
      </a>
    </div>
  );
}
