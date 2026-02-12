export const COMPOUNDS: Record<string, { tw: string; hex: string }> = {
  SOFT: { tw: "bg-red-500", hex: "#ef4444" },
  MEDIUM: { tw: "bg-yellow-500", hex: "#eab308" },
  HARD: { tw: "bg-white", hex: "#e5e5e5" },
  INTERMEDIATE: { tw: "bg-green-500", hex: "#22c55e" },
  WET: { tw: "bg-blue-500", hex: "#3b82f6" },
  UNKNOWN: { tw: "bg-white/30", hex: "#666" },
};

export function formatLapTime(seconds: number | null): string {
  if (seconds === null) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toFixed(3).padStart(6, "0")}`;
  }
  return secs.toFixed(3);
}

export function formatSector(seconds: number | null): string {
  if (seconds === null) return "—";
  return seconds.toFixed(3);
}

export function formatGap(gap: number | null): string {
  if (gap === null) return "—";
  if (gap === 0) return "Leader";
  return `+${gap.toFixed(3)}`;
}
