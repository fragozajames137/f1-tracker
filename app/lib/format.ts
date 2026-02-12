export const COMPOUNDS: Record<string, { tw: string; hex: string }> = {
  SOFT: { tw: "bg-red-500", hex: "#ef4444" },
  MEDIUM: { tw: "bg-yellow-500", hex: "#eab308" },
  HARD: { tw: "bg-white", hex: "#e5e5e5" },
  INTERMEDIATE: { tw: "bg-green-500", hex: "#22c55e" },
  WET: { tw: "bg-blue-500", hex: "#3b82f6" },
  UNKNOWN: { tw: "bg-white/30", hex: "#666" },
};

/** Approximate tyre degradation rates in seconds per lap */
export const DEGRADATION: Record<string, number> = {
  SOFT: 0.05,
  MEDIUM: 0.03,
  HARD: 0.01,
  INTERMEDIATE: 0.04,
  WET: 0.02,
};

/** Fuel burn effect on lap time */
export const FUEL_EFFECT = {
  /** kg of fuel burned per lap */
  burnPerLap: 1.6,
  /** seconds gained per kg of fuel burned */
  timePerKg: 0.032,
  /** net seconds gained per lap from fuel burn (~0.051 s/lap) */
  perLap: 0.051,
} as const;

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
