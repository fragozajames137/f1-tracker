import { deepMerge, log } from "./utils.js";
import type {
  TimingDataMessage,
  DriverListMessage,
  RaceControlMessagesMessage,
  WeatherDataMessage,
  TeamRadioMessage,
  TimingAppDataMessage,
  SessionInfoMessage,
  LapCountMessage,
  TrackStatusMessage,
  RaceControlEntry,
  WeatherDataMessage as WeatherSnapshot,
  TeamRadioCapture,
} from "./types.js";

// ---------------------------------------------------------------------------
// Accumulated state — full picture from merged deltas
// ---------------------------------------------------------------------------

export interface AccumulatedState {
  timingData: TimingDataMessage;
  driverList: DriverListMessage;
  raceControlMessages: RaceControlEntry[];
  weatherSnapshots: WeatherSnapshot[];
  teamRadioCaptures: TeamRadioCapture[];
  timingAppData: TimingAppDataMessage;
  sessionInfo: SessionInfoMessage;
  lapCount: LapCountMessage;
  trackStatus: TrackStatusMessage;
  dirty: boolean;
}

export function createEmptyState(): AccumulatedState {
  return {
    timingData: {},
    driverList: {},
    raceControlMessages: [],
    weatherSnapshots: [],
    teamRadioCaptures: [],
    timingAppData: {},
    sessionInfo: {},
    lapCount: {},
    trackStatus: {},
    dirty: false,
  };
}

// ---------------------------------------------------------------------------
// State Manager — accumulates SignalR deltas
// ---------------------------------------------------------------------------

export class StateManager {
  private state: AccumulatedState = createEmptyState();
  /** Track previous lap counts per driver to detect new laps */
  private prevLapCounts = new Map<string, number>();
  /** Track seen race control message keys to avoid duplicates */
  private seenRcKeys = new Set<string>();
  /** Track seen team radio keys to avoid duplicates */
  private seenRadioKeys = new Set<string>();

  reset(): void {
    this.state = createEmptyState();
    this.prevLapCounts.clear();
    this.seenRcKeys.clear();
    this.seenRadioKeys.clear();
  }

  getState(): AccumulatedState {
    return this.state;
  }

  isDirty(): boolean {
    return this.state.dirty;
  }

  clearDirty(): void {
    this.state.dirty = false;
  }

  // -----------------------------------------------------------------------
  // Topic handlers
  // -----------------------------------------------------------------------

  handleTopic(topic: string, data: unknown): void {
    switch (topic) {
      case "TimingData":
        this.mergeTimingData(data as TimingDataMessage);
        break;
      case "DriverList":
        this.mergeDriverList(data as DriverListMessage);
        break;
      case "RaceControlMessages":
        this.appendRaceControl(data as RaceControlMessagesMessage);
        break;
      case "WeatherData":
        this.appendWeather(data as WeatherDataMessage);
        break;
      case "TeamRadio":
        this.appendTeamRadio(data as TeamRadioMessage);
        break;
      case "TimingAppData":
        this.mergeTimingAppData(data as TimingAppDataMessage);
        break;
      case "SessionInfo":
        this.mergeSessionInfo(data as SessionInfoMessage);
        break;
      case "LapCount":
        this.mergeLapCount(data as LapCountMessage);
        break;
      case "TrackStatus":
        this.mergeTrackStatus(data as TrackStatusMessage);
        break;
      case "Heartbeat":
        // No state to accumulate — just used for liveness
        break;
      default:
        log(`Unknown topic: ${topic}`);
    }
  }

  // -----------------------------------------------------------------------
  // Delta-merged topics
  // -----------------------------------------------------------------------

  private mergeTimingData(msg: TimingDataMessage): void {
    if (!msg) return;
    deepMerge(
      this.state.timingData as Record<string, unknown>,
      msg as unknown as Record<string, unknown>,
    );
    this.state.dirty = true;
  }

  private mergeDriverList(msg: DriverListMessage): void {
    if (!msg) return;
    deepMerge(
      this.state.driverList as Record<string, unknown>,
      msg as unknown as Record<string, unknown>,
    );
    this.state.dirty = true;
  }

  private mergeTimingAppData(msg: TimingAppDataMessage): void {
    if (!msg) return;
    deepMerge(
      this.state.timingAppData as Record<string, unknown>,
      msg as unknown as Record<string, unknown>,
    );
    this.state.dirty = true;
  }

  private mergeSessionInfo(msg: SessionInfoMessage): void {
    if (!msg) return;
    deepMerge(
      this.state.sessionInfo as Record<string, unknown>,
      msg as unknown as Record<string, unknown>,
    );
    this.state.dirty = true;
  }

  private mergeLapCount(msg: LapCountMessage): void {
    if (!msg) return;
    Object.assign(this.state.lapCount, msg);
    this.state.dirty = true;
  }

  private mergeTrackStatus(msg: TrackStatusMessage): void {
    if (!msg) return;
    Object.assign(this.state.trackStatus, msg);
    this.state.dirty = true;
  }

  // -----------------------------------------------------------------------
  // Append-only topics (race control, weather, team radio)
  // -----------------------------------------------------------------------

  private appendRaceControl(msg: RaceControlMessagesMessage): void {
    if (!msg?.Messages) return;

    for (const [idx, entry] of Object.entries(msg.Messages)) {
      const key = `${idx}_${entry.Utc}_${entry.Message}`;
      if (this.seenRcKeys.has(key)) continue;
      this.seenRcKeys.add(key);
      this.state.raceControlMessages.push(entry);
    }
    this.state.dirty = true;
  }

  private appendWeather(msg: WeatherDataMessage): void {
    if (!msg) return;
    // Weather comes as a single snapshot, not a collection
    this.state.weatherSnapshots.push({ ...msg });
    this.state.dirty = true;
  }

  private appendTeamRadio(msg: TeamRadioMessage): void {
    if (!msg?.Captures) return;

    for (const [idx, capture] of Object.entries(msg.Captures)) {
      const key = `${idx}_${capture.Utc}_${capture.RacingNumber}`;
      if (this.seenRadioKeys.has(key)) continue;
      this.seenRadioKeys.add(key);
      this.state.teamRadioCaptures.push(capture);
    }
    this.state.dirty = true;
  }
}
