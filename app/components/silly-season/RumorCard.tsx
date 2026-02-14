import { Rumor } from "@/app/types";

interface RumorCardProps {
  rumor: Rumor;
  driverName: string;
  teamColor: string;
}

export default function RumorCard({ rumor, driverName, teamColor }: RumorCardProps) {
  return (
    <a
      href={rumor.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10 hover:border-white/20"
    >
      <p className="text-sm text-white/80 leading-relaxed">{rumor.text}</p>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: teamColor }}
          />
          <span className="text-xs font-medium text-white/60">{driverName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium" style={{ color: teamColor }}>
            {rumor.source}
          </span>
          <span className="text-xs text-white/30">{rumor.date}</span>
        </div>
      </div>
    </a>
  );
}
