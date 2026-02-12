"use client";

import Image from "next/image";
import { Team, Driver } from "@/app/types";
import SeatCard from "./SeatCard";
import { logoSrc, extractSlug } from "@/app/lib/image-helpers";
import { getBlurPlaceholder } from "@/app/lib/blur-placeholders";

interface TeamRowProps {
  team: Team;
  onSelectDriver: (driver: Driver, team: Team) => void;
}

export default function TeamRow({ team, onSelectDriver }: TeamRowProps) {
  const slug = extractSlug(team.logoUrl, "logos");
  const blur = slug ? getBlurPlaceholder(`logos/${slug}`) : undefined;

  return (
    <div className="group">
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
        <h2 className="font-display text-base font-bold text-white">{team.name}</h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SeatCard
          driver={team.seat1}
          teamColor={team.color}
          seatLabel="Seat 1"
          onClick={() => onSelectDriver(team.seat1, team)}
        />
        <SeatCard
          driver={team.seat2}
          teamColor={team.color}
          seatLabel="Seat 2"
          onClick={() => onSelectDriver(team.seat2, team)}
        />
      </div>
    </div>
  );
}
