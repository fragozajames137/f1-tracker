export const COMPOUND_COLORS: Record<string, string> = {
  SOFT: "bg-red-500",
  MEDIUM: "bg-yellow-500",
  HARD: "bg-white",
  INTERMEDIATE: "bg-green-500",
  WET: "bg-blue-500",
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
