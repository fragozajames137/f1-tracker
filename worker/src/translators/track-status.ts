import type { AccumulatedState } from "../state-manager.js";

/**
 * Get current track status from accumulated state.
 */
export function getTrackStatus(state: AccumulatedState): {
  status: string;
  message: string;
} {
  return {
    status: state.trackStatus.Status ?? "1",
    message: state.trackStatus.Message ?? "AllClear",
  };
}
