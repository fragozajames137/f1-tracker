// node-signalr is CJS — runtime exports lowercase `client` class
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import pkg from "node-signalr";
import { log, logError, sleep } from "./utils.js";
import type { SignalRFeed } from "./types.js";

// Minimal type for the node-signalr client
interface NodeSignalRClient {
  on(event: string, ...args: unknown[]): void;
  call(hub: string, method: string, ...args: unknown[]): Promise<unknown>;
  start(): void;
  end(): void;
}

// Runtime: pkg.client is the constructor (lowercase)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NodeClient = (pkg as any).client as {
  new (url: string, hubs: string[], options?: Record<string, unknown>): NodeSignalRClient;
};

const SIGNALR_URL = "https://livetiming.formula1.com/signalr";
const HUB_NAME = "Streaming";
const INITIAL_RECONNECT_MS = 5_000;
const MAX_RECONNECT_MS = 60_000;

const TOPICS = [
  "TimingData",
  "DriverList",
  "RaceControlMessages",
  "WeatherData",
  "TeamRadio",
  "TimingAppData",
  "SessionInfo",
  "LapCount",
  "TrackStatus",
  "Heartbeat",
];

export type FeedCallback = (topic: string, data: unknown) => void;

export class SignalRClient {
  private client: NodeSignalRClient | null = null;
  private onFeed: FeedCallback;
  private shouldReconnect = true;
  private connected = false;
  private reconnectAttempt = 0;

  constructor(onFeed: FeedCallback) {
    this.onFeed = onFeed;
  }

  async connect(): Promise<void> {
    this.shouldReconnect = true;
    await this._connect();
  }

  private async _connect(): Promise<void> {
    try {
      log("Connecting to F1 SignalR...");

      const client = new NodeClient(SIGNALR_URL, [HUB_NAME], {
        headers: {
          "User-Agent": "BestHTTP",
          "Accept-Encoding": "gzip, identity",
          Connection: "keep-alive, Upgrade",
        },
      });

      this.client = client;

      client.on("connected", () => {
        log("SignalR connected");
        this.connected = true;
        this.reconnectAttempt = 0;

        // Subscribe to all topics
        client
          .call(HUB_NAME, "Subscribe", TOPICS)
          .then((result: unknown) => {
            const initialData = result as SignalRFeed;
            log("Received initial data snapshot");
            // Initial data comes as a single object with all topics
            for (const [topic, data] of Object.entries(initialData)) {
              if (data !== undefined && data !== null) {
                this.onFeed(topic, data);
              }
            }
          })
          .catch((err: Error) => {
            logError("Subscribe call failed:", err.message);
          });
      });

      // F1 sends updates via the "feed" method on the hub
      client.on(HUB_NAME, "feed", (...args: unknown[]) => {
        const [topic, data] = args;
        this.onFeed(topic as string, data);
      });

      client.on("disconnected", (reason: string) => {
        log("SignalR disconnected:", reason);
        this.connected = false;
        if (this.shouldReconnect) {
          this._scheduleReconnect();
        }
      });

      client.on("error", (err: Error) => {
        logError("SignalR error:", err.message);
        this.connected = false;
        if (this.shouldReconnect) {
          this._scheduleReconnect();
        }
      });

      client.start();
    } catch (err) {
      logError("Failed to create SignalR connection:", err);
      if (this.shouldReconnect) {
        this._scheduleReconnect();
      }
    }
  }

  private async _scheduleReconnect(): Promise<void> {
    const delay = Math.min(
      INITIAL_RECONNECT_MS * Math.pow(2, this.reconnectAttempt),
      MAX_RECONNECT_MS,
    );
    this.reconnectAttempt++;
    log(`Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempt})...`);
    await sleep(delay);
    if (this.shouldReconnect) {
      await this._connect();
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.client) {
      try {
        this.client.end();
      } catch {
        // Ignore disconnect errors
      }
      this.client = null;
    }
    this.connected = false;
    log("SignalR client disconnected");
  }

  isConnected(): boolean {
    return this.connected;
  }
}
