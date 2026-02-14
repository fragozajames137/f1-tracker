"use client";

import { useDraggable } from "@dnd-kit/core";
import { nationalityToIso } from "@/app/lib/flags";
import Flag from "@/app/components/Flag";
import type { PredictorDriver } from "@/app/stores/gridPredictor";

interface DriverChipProps {
  driver: PredictorDriver;
  isDragOverlay?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
}

export default function DriverChip({ driver, isDragOverlay, isSelected, onSelect, onRemove }: DriverChipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: driver.id,
    disabled: driver.isLocked,
  });

  const iso = nationalityToIso(driver.nationality);

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      {...(isDragOverlay ? {} : { ...listeners, ...attributes })}
      onClick={(e) => {
        if (isDragOverlay || driver.isLocked || !onSelect) return;
        e.stopPropagation();
        onSelect();
      }}
      className={`
        inline-flex items-center gap-2 rounded-lg px-3 py-2
        text-sm font-medium text-white transition-all select-none
        ${driver.isLocked
          ? "bg-white/5 cursor-default opacity-70"
          : "bg-white/10 cursor-grab hover:bg-white/15 active:cursor-grabbing"
        }
        ${isDragging && !isDragOverlay ? "opacity-30" : ""}
        ${isDragOverlay ? "shadow-lg shadow-black/50 ring-2 ring-white/20 scale-105" : ""}
        ${isSelected ? "ring-2 ring-white/50 bg-white/20" : ""}
      `}
    >
      {driver.isLocked && (
        <svg className="h-3 w-3 shrink-0 text-green-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
      )}

      {iso && <Flag iso={iso} size={14} className="shrink-0 opacity-80" />}

      <span className="truncate">{driver.name}</span>

      {driver.isCustom && (
        <span className="text-[10px] rounded-full bg-purple-500/20 px-1.5 py-0.5 text-purple-400">
          Custom
        </span>
      )}

      {onRemove && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-auto shrink-0 cursor-pointer text-white/30 hover:text-white/60"
          aria-label={`Remove ${driver.name}`}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
