import type { AccumulatedState } from "../state-manager.js";

/**
 * Get current lap count from accumulated state.
 */
export function getLapCount(state: AccumulatedState): {
  currentLap: number;
  totalLaps: number;
} {
  return {
    currentLap: state.lapCount.CurrentLap ?? 0,
    totalLaps: state.lapCount.TotalLaps ?? 0,
  };
}
