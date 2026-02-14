"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useSearchParams } from "next/navigation";
import type { GridData } from "@/app/types";
import { useGridPredictorStore } from "@/app/stores/gridPredictor";
import TeamSlot from "./TeamSlot";
import DriverPool from "./DriverPool";
import DriverChip from "./DriverChip";
import ShareButton from "./ShareButton";

interface GridPredictorProps {
  data: GridData;
}

export default function GridPredictor({ data }: GridPredictorProps) {
  const searchParams = useSearchParams();
  const initialized = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const initialize = useGridPredictorStore((s) => s.initialize);
  const hydrateFromUrl = useGridPredictorStore((s) => s.hydrateFromUrl);
  const reset = useGridPredictorStore((s) => s.reset);
  const placeDriver = useGridPredictorStore((s) => s.placeDriver);
  const drivers = useGridPredictorStore((s) => s.drivers);
  const isInitialized = useGridPredictorStore((s) => s.isInitialized);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    initialize();

    const gridParam = searchParams.get("grid");
    if (gridParam) {
      hydrateFromUrl(gridParam);
    }
  }, [initialize, hydrateFromUrl, searchParams]);

  const activeDriver = activeDragId ? drivers[activeDragId] : null;

  function handleDragStart(event: DragStartEvent) {
    setSelectedDriverId(null);
    const driverId = event.active.id as string;
    const driver = drivers[driverId];
    if (driver?.isLocked) return;
    setActiveDragId(driverId);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const driverId = active.id as string;
    const overId = over.id as string;

    if (!overId.startsWith("seat|")) return;
    const pipeIdx1 = overId.indexOf("|");
    const pipeIdx2 = overId.lastIndexOf("|");
    const teamId = overId.slice(pipeIdx1 + 1, pipeIdx2);
    const seatIndex = parseInt(overId.slice(pipeIdx2 + 1)) as 0 | 1;

    placeDriver(driverId, teamId, seatIndex);
  }

  // Click-to-place: toggle selection on a driver
  const handleSelectDriver = useCallback((driverId: string) => {
    setSelectedDriverId((prev) => (prev === driverId ? null : driverId));
  }, []);

  // Click-to-place: place selected driver into a seat
  const handleSeatClick = useCallback((teamId: string, seatIndex: 0 | 1) => {
    if (!selectedDriverId) return;
    placeDriver(selectedDriverId, teamId, seatIndex);
    setSelectedDriverId(null);
  }, [selectedDriverId, placeDriver]);

  const handleReset = useCallback(() => {
    reset();
    setSelectedDriverId(null);
  }, [reset]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={handleReset}
          className="cursor-pointer rounded-lg border border-white/10 px-4 py-2 text-sm text-white/50 transition-colors hover:bg-white/5 hover:text-white"
        >
          Reset Grid
        </button>
        <ShareButton gridRef={gridRef} />
      </div>

      {selectedDriverId && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2">
          <span className="text-sm text-white/50">Selected:</span>
          <span className="text-sm font-medium text-white">{drivers[selectedDriverId]?.name}</span>
          <span className="text-sm text-white/30">— click a seat to place, or click driver again to deselect</span>
        </div>
      )}

      <div ref={gridRef}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {data.teams.map((team) => (
            <TeamSlot
              key={team.id}
              team={team}
              selectedDriverId={selectedDriverId}
              onSeatClick={handleSeatClick}
              onSelectDriver={handleSelectDriver}
            />
          ))}
        </div>
      </div>

      <DriverPool
        selectedDriverId={selectedDriverId}
        onSelectDriver={handleSelectDriver}
      />

      <DragOverlay>
        {activeDriver ? <DriverChip driver={activeDriver} isDragOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
