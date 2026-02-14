"use client";

import { useDroppable } from "@dnd-kit/core";
import Image from "next/image";
import type { Team } from "@/app/types";
import { useGridPredictorStore } from "@/app/stores/gridPredictor";
import { logoSrc, extractSlug } from "@/app/lib/image-helpers";
import DriverChip from "./DriverChip";

interface TeamSlotProps {
  team: Team;
  selectedDriverId: string | null;
  onSeatClick: (teamId: string, seatIndex: 0 | 1) => void;
  onSelectDriver: (driverId: string) => void;
}

function SeatDropZone({
  teamId,
  seatIndex,
  teamColor,
  hasSelection,
  onSeatClick,
  onSelectDriver,
}: {
  teamId: string;
  seatIndex: 0 | 1;
  teamColor: string;
  hasSelection: boolean;
  onSeatClick: () => void;
  onSelectDriver: (driverId: string) => void;
}) {
  const droppableId = `seat|${teamId}|${seatIndex}`;
  const { isOver, setNodeRef } = useDroppable({ id: droppableId });

  const drivers = useGridPredictorStore((s) => s.drivers);
  const seats = useGridPredictorStore((s) => s.seats);
  const removeDriver = useGridPredictorStore((s) => s.removeDriver);

  const seatAssignment = seats[teamId];
  const driverId = seatAssignment ? seatAssignment[seatIndex] : null;
  const driver = driverId ? drivers[driverId] : null;

  const clickable = hasSelection && (!driver || !driver.isLocked);

  return (
    <div
      ref={setNodeRef}
      onClick={() => { if (clickable) onSeatClick(); }}
      className={`
        relative min-h-[60px] rounded-xl border-2 p-3 transition-colors
        ${driver ? "border-solid border-white/10" : "border-dashed border-white/10"}
        ${isOver ? "border-white/40 bg-white/10" : "bg-white/[0.02]"}
        ${clickable ? "cursor-pointer hover:border-white/30 hover:bg-white/[0.06]" : ""}
      `}
    >
      <div
        className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
        style={{ backgroundColor: teamColor }}
      />

      {driver ? (
        <div className="ml-1">
          <DriverChip
            driver={driver}
            onRemove={driver.isLocked ? undefined : () => removeDriver(driver.id)}
            onSelect={driver.isLocked ? undefined : () => onSelectDriver(driver.id)}
          />
        </div>
      ) : (
        <div className="ml-1 flex h-full min-h-[36px] items-center text-sm text-white/20">
          {hasSelection ? "Click to place" : "Drop driver here"}
        </div>
      )}
    </div>
  );
}

export default function TeamSlot({ team, selectedDriverId, onSeatClick, onSelectDriver }: TeamSlotProps) {
  const slug = extractSlug(team.logoUrl, "logos");
  const displayColor = team.id === "cadillac" ? "#FFFFFF" : team.color;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2.5">
        {slug ? (
          <Image
            src={logoSrc(slug, 48)}
            alt={team.name}
            width={24}
            height={24}
            className="h-6 w-auto shrink-0 object-contain"
          />
        ) : (
          <div
            className="h-6 w-6 rounded"
            style={{ backgroundColor: displayColor }}
          />
        )}
        <span className="text-sm font-bold text-white">{team.name}</span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <SeatDropZone
          teamId={team.id}
          seatIndex={0}
          teamColor={displayColor}
          hasSelection={!!selectedDriverId}
          onSeatClick={() => onSeatClick(team.id, 0)}
          onSelectDriver={onSelectDriver}
        />
        <SeatDropZone
          teamId={team.id}
          seatIndex={1}
          teamColor={displayColor}
          hasSelection={!!selectedDriverId}
          onSeatClick={() => onSeatClick(team.id, 1)}
          onSelectDriver={onSelectDriver}
        />
      </div>
    </div>
  );
}
