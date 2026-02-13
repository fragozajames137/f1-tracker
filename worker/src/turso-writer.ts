import { createClient, type Client, type InStatement } from "@libsql/client";
import { log, logError } from "./utils.js";
import type { StateManager } from "./state-manager.js";
import type { OpenF1Lap, OpenF1Pit } from "./types.js";
import {
  translatePositions,
  translateIntervals,
  translateLaps,
  translatePitStops,
  translateDrivers,
  translateWeather,
  translateRaceControl,
  translateTeamRadio,
  translateStints,
  translateSession,
  getLapCount,
  getTrackStatus,
} from "./translators/index.js";

export class TursoWriter {
  private client: Client;
  /** Persistent lap history across flushes (keyed by driverNum_lapNum) */
  lapHistory = new Map<string, OpenF1Lap>();
  /** Persistent pit stop list across flushes */
  pitStops: OpenF1Pit[] = [];
  /** Track in-pit state per driver for pit detection */
  inPitState = new Map<string, boolean>();

  constructor() {
    this.client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  /**
   * Reset translator state for a new session.
   */
  resetForNewSession(): void {
    this.lapHistory.clear();
    this.pitStops = [];
    this.inPitState.clear();
  }

  /**
   * Translate accumulated state and batch-upsert all topics to Turso.
   */
  async flush(stateManager: StateManager, sessionKey: number): Promise<void> {
    if (!stateManager.isDirty()) return;

    const state = stateManager.getState();
    const now = new Date().toISOString();

    try {
      // Translate all topics
      const positions = translatePositions(state, sessionKey);
      const intervals = translateIntervals(state, sessionKey);
      const laps = translateLaps(state, sessionKey, this.lapHistory);
      const pits = translatePitStops(state, sessionKey, this.pitStops, this.inPitState);
      const drivers = translateDrivers(state, sessionKey);
      const weather = translateWeather(state, sessionKey);
      const raceControl = translateRaceControl(state, sessionKey);
      const teamRadio = translateTeamRadio(state, sessionKey);
      const stints = translateStints(state, sessionKey);
      const session = translateSession(state, sessionKey);
      const lapCount = getLapCount(state);
      const trackStatus = getTrackStatus(state);

      // Build batch of upsert statements
      const statements: InStatement[] = [];
      const upsertSQL = `
        INSERT INTO live_state (session_key, topic, data, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (session_key, topic)
        DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
      `;

      const topics: [string, unknown][] = [
        ["positions", positions],
        ["intervals", intervals],
        ["laps", laps],
        ["pit_stops", pits],
        ["drivers", drivers],
        ["weather", weather],
        ["race_control", raceControl],
        ["team_radio", teamRadio],
        ["stints", stints],
        ["meta", {
          session: session,
          lap_count: lapCount,
          track_status: trackStatus,
        }],
      ];

      for (const [topic, data] of topics) {
        statements.push({
          sql: upsertSQL,
          args: [sessionKey, topic, JSON.stringify(data), now],
        });
      }

      await this.client.batch(statements, "write");

      stateManager.clearDirty();
      log(
        `Flushed ${topics.length} topics to Turso (session ${sessionKey}, ` +
        `${positions.length} positions, ${laps.length} laps, ${drivers.length} drivers)`,
      );
    } catch (err) {
      logError("Failed to flush to Turso:", err);
    }
  }

  close(): void {
    this.client.close();
  }
}
