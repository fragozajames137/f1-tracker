"use client";

import { useState, useMemo } from "react";
import { useGridPredictorStore } from "@/app/stores/gridPredictor";
import type { PredictorDriver } from "@/app/stores/gridPredictor";
import DriverChip from "./DriverChip";
import AddDriverModal from "./AddDriverModal";

function PoolSection({
  title,
  drivers,
  selectedDriverId,
  onSelectDriver,
  onDeleteCustom,
}: {
  title: string;
  drivers: PredictorDriver[];
  selectedDriverId: string | null;
  onSelectDriver: (driverId: string) => void;
  onDeleteCustom?: (id: string) => void;
}) {
  if (drivers.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {drivers.map((d) => (
          <div key={d.id} className="flex items-center gap-1">
            <DriverChip
              driver={d}
              isSelected={selectedDriverId === d.id}
              onSelect={() => onSelectDriver(d.id)}
            />
            {onDeleteCustom && (
              <button
                onClick={() => onDeleteCustom(d.id)}
                className="cursor-pointer rounded p-1 text-white/20 transition-colors hover:bg-white/10 hover:text-red-400"
                aria-label={`Delete ${d.name}`}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface DriverPoolProps {
  selectedDriverId: string | null;
  onSelectDriver: (driverId: string) => void;
}

export default function DriverPool({ selectedDriverId, onSelectDriver }: DriverPoolProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const drivers = useGridPredictorStore((s) => s.drivers);
  const seats = useGridPredictorStore((s) => s.seats);
  const removeCustomDriver = useGridPredictorStore((s) => s.removeCustomDriver);

  const seatedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [, pair] of Object.entries(seats)) {
      if (pair[0]) ids.add(pair[0]);
      if (pair[1]) ids.add(pair[1]);
    }
    return ids;
  }, [seats]);

  const allDrivers = Object.values(drivers);
  const freeAgents = allDrivers.filter((d) => !seatedIds.has(d.id) && d.pool === "freeAgent" && !d.isCustom);
  const reserves = allDrivers.filter((d) => !seatedIds.has(d.id) && d.pool === "reserve");
  const academy = allDrivers.filter((d) => !seatedIds.has(d.id) && d.pool === "academy");
  const custom = allDrivers.filter((d) => !seatedIds.has(d.id) && d.isCustom);

  const isEmpty = freeAgents.length === 0 && reserves.length === 0 && academy.length === 0 && custom.length === 0;

  return (
    <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Driver Pool</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="cursor-pointer rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
        >
          + Add Driver
        </button>
      </div>

      <div className="space-y-6">
        <PoolSection title="2026 Drivers (Free Agents)" drivers={freeAgents} selectedDriverId={selectedDriverId} onSelectDriver={onSelectDriver} />
        <PoolSection title="Reserve / Test Drivers" drivers={reserves} selectedDriverId={selectedDriverId} onSelectDriver={onSelectDriver} />
        <PoolSection title="Academy / Development" drivers={academy} selectedDriverId={selectedDriverId} onSelectDriver={onSelectDriver} />
        <PoolSection title="Custom Drivers" drivers={custom} selectedDriverId={selectedDriverId} onSelectDriver={onSelectDriver} onDeleteCustom={removeCustomDriver} />
      </div>

      {isEmpty && (
        <p className="py-8 text-center text-sm text-white/30">
          All drivers have been placed! Your 2027 grid is complete.
        </p>
      )}

      {showAddModal && <AddDriverModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
