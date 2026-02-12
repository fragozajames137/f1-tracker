"use client";

import { Driver, ContractStatus } from "@/app/types";

const statusConfig: Record<ContractStatus, { label: string; className: string }> = {
  locked: { label: "Locked", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  expiring: { label: "Expiring", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  open: { label: "Open", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

interface SeatCardProps {
  driver: Driver;
  teamColor: string;
  seatLabel: string;
  onClick: () => void;
}

export default function SeatCard({ driver, teamColor, seatLabel, onClick }: SeatCardProps) {
  const status = statusConfig[driver.contractStatus];
  const isOpen = driver.contractStatus === "open";

  return (
    <button
      onClick={onClick}
      className="group relative w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-all hover:bg-white/10 hover:border-white/20 cursor-pointer"
    >
      <div
        className="absolute top-0 left-0 h-full w-1 rounded-l-xl"
        style={{ backgroundColor: teamColor }}
      />

      <div className="ml-2">
        <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">{seatLabel}</p>

        <p className={`text-lg font-bold ${isOpen ? "text-white/40 italic" : "text-white"}`}>
          {driver.name}
        </p>

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {driver.number && (
            <span className="text-sm font-mono text-white/50">#{driver.number}</span>
          )}
          <span className="text-xs text-white/40">{driver.nationality}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${status.className}`}>
            {status.label}
          </span>
        </div>

        {driver.contractEnd && (
          <p className="mt-1.5 text-xs text-white/30">
            Contract: until {driver.contractEnd}
          </p>
        )}

        {driver.rumors.length > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-yellow-400/70">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                clipRule="evenodd"
              />
            </svg>
            {driver.rumors.length} rumor{driver.rumors.length > 1 ? "s" : ""}
          </div>
        )}
      </div>

      <div className="absolute top-3 right-3 text-white/20 transition-colors group-hover:text-white/50">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
