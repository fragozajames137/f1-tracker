import type { AccumulatedState } from "../state-manager.js";
import type { OpenF1Weather } from "../types.js";

/**
 * Translate accumulated weather snapshots into OpenF1Weather array.
 */
export function translateWeather(
  state: AccumulatedState,
  sessionKey: number,
): OpenF1Weather[] {
  return state.weatherSnapshots.map((snap) => ({
    session_key: sessionKey,
    date: new Date().toISOString(),
    air_temperature: parseFloat(snap.AirTemp ?? "0") || 0,
    track_temperature: parseFloat(snap.TrackTemp ?? "0") || 0,
    humidity: parseFloat(snap.Humidity ?? "0") || 0,
    pressure: parseFloat(snap.Pressure ?? "0") || 0,
    rainfall: snap.Rainfall === "1" || snap.Rainfall === "true" ? 1 : 0,
    wind_direction: parseFloat(snap.WindDirection ?? "0") || 0,
    wind_speed: parseFloat(snap.WindSpeed ?? "0") || 0,
  }));
}
