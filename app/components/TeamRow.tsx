"use client";

import Image from "next/image";
import { Team, Driver } from "@/app/types";
import SeatCard from "./SeatCard";

interface TeamRowProps {
  team: Team;
  onSelectDriver: (driver: Driver, team: Team) => void;
}

export default function TeamRow({ team, onSelectDriver }: TeamRowProps) {
  return (
    <div className="group">
      <div className="mb-3 flex items-center gap-3">
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{ backgroundColor: team.color }}
        >
          {team.logoUrl ? (
            <Image
              src={team.logoUrl}
              alt={team.name}
              width={18}
              height={18}
              className="brightness-0 invert"
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
