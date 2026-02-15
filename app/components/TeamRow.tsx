"use client";

import Image from "next/image";
import Link from "next/link";
import { Team } from "@/app/types";
import SeatCard from "./SeatCard";
import { logoSrc, extractSlug } from "@/app/lib/image-helpers";
import { getBlurPlaceholder } from "@/app/lib/blur-placeholders";

interface TeamRowProps {
  team: Team;
  isFavorite?: boolean;
}

export default function TeamRow({ team, isFavorite }: TeamRowProps) {
  const slug = extractSlug(team.logoUrl, "logos");
  const blur = slug ? getBlurPlaceholder(`logos/${slug}`) : undefined;
  const accentColor = team.id === "cadillac" ? "#FFFFFF" : team.color;

  return (
    <div className={`group${isFavorite ? " rounded-xl border border-white/10 bg-white/[0.03] p-4" : ""}`}>
      <div className="mb-3 flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-md"
          style={{ backgroundColor: team.color }}
        >
          {slug ? (
            <Image
              src={logoSrc(slug, 48)}
              alt={team.name}
              width={24}
              height={24}
              className="h-5 w-auto object-contain"
              placeholder={blur ? "blur" : undefined}
              blurDataURL={blur}
            />
          ) : null}
        </div>
        <Link
          href={`/team/${team.id}`}
          className="font-display text-base font-bold text-white hover:text-white/80 transition-colors"
        >
          {team.name}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SeatCard
          driver={team.seat1}
          teamColor={accentColor}
          seatLabel="Seat 1"
        />
        <SeatCard
          driver={team.seat2}
          teamColor={accentColor}
          seatLabel="Seat 2"
        />
      </div>
    </div>
  );
}
