"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { GridData, ContractStatus } from "@/app/types";
import { STATUS_CONFIG } from "@/app/lib/drivers";
import { logoSrc, extractSlug } from "@/app/lib/image-helpers";

interface ContractGridProps {
  data: GridData;
}

const FILTERS: { key: ContractStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "expiring", label: "Expiring" },
  { key: "open", label: "Open" },
  { key: "locked", label: "Locked" },
];

export default function ContractGrid({ data }: ContractGridProps) {
  const [filter, setFilter] = useState<ContractStatus | "all">("all");

  const teams = data.teams.filter((team) => {
    if (filter === "all") return true;
    return (
      team.seat1.contractStatus === filter || team.seat2.contractStatus === filter
    );
  });

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`cursor-pointer rounded-full px-4 py-2 text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-white/20 text-white"
                : "border border-white/10 text-white/40 hover:text-white/70"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="space-y-4">
        {teams.map((team) => {
          const teamSlug = extractSlug(team.logoUrl, "logos");
          const seats = [team.seat1, team.seat2].filter(
            (s) => filter === "all" || s.contractStatus === filter,
          );

          return (
            <div
              key={team.id}
              className="rounded-lg border border-white/10 bg-white/[0.02] p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                {teamSlug && (
                  <Image
                    src={logoSrc(teamSlug, 48)}
                    alt={team.name}
                    width={16}
                    height={16}
                    className="h-4 w-auto object-contain"
                  />
                )}
                <Link
                  href={`/team/${team.id}`}
                  className="text-sm font-medium text-white/70 hover:text-white transition-colors"
                >
                  {team.name}
                </Link>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {seats.map((driver) => {
                  const status = STATUS_CONFIG[driver.contractStatus];
                  return (
                    <Link
                      key={driver.id}
                      href={`/driver/${driver.id}`}
                      className="flex items-center justify-between rounded-md border border-white/5 bg-white/5 px-3 py-2 transition-colors hover:bg-white/10"
                    >
                      <span className="text-sm text-white/80">{driver.name}</span>
                      <div className="flex items-center gap-2">
                        {driver.contractEnd && (
                          <span className="text-xs text-white/30">{driver.contractEnd}</span>
                        )}
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
