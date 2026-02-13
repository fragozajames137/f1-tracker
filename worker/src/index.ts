import { log, logError, sleep } from "./utils.js";
import { fetchSchedule, findNextWakeup, logUpcoming } from "./schedule.js";
import { discoverLiveSession } from "./session-discovery.js";
import { SignalRClient } from "./signalr-client.js";
import { StateManager } from "./state-manager.js";
import { TursoWriter } from "./turso-writer.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DISCOVERY_POLL_MS = 60_000;    // Check for live session every 60s (once awake)
const FLUSH_INTERVAL_MS = 3_000;     // Flush to Turso every 3s
const SESSION_END_GRACE_MS = 30_000; // Wait 30s after session ends before stopping
const SCHEDULE_RETRY_MS = 600_000;   // Retry schedule fetch every 10min on failure
const MAX_AWAKE_MS = 4 * 60 * 60 * 1000; // Max 4h awake per session window

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  log("F1 Live Timing Worker starting...");

  // Validate environment
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    logError("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set");
    process.exit(1);
  }

  const writer = new TursoWriter();
  const stateManager = new StateManager();

  // Graceful shutdown
  let shutdownRequested = false;
  const shutdown = () => {
    log("Shutdown requested");
    shutdownRequested = true;
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  while (!shutdownRequested) {
    try {
      // Phase 1: Fetch the season schedule
      log("Fetching 2026 F1 schedule...");
      let schedule;
      try {
        schedule = await fetchSchedule();
        log(`Loaded ${schedule.length} sessions from Jolpica`);
        logUpcoming(schedule);
      } catch (err) {
        logError("Failed to fetch schedule:", err);
        log(`Retrying in ${SCHEDULE_RETRY_MS / 1000}s...`);
        await sleep(SCHEDULE_RETRY_MS);
        continue;
      }

      // Phase 2: Sleep until 1 hour before the next session
      const wakeup = findNextWakeup(schedule);
      if (!wakeup) {
        log("No more sessions this season. Sleeping 24h then rechecking...");
        await sleep(24 * 60 * 60 * 1000);
        continue;
      }

      if (wakeup.sleepMs > 0) {
        const hours = Math.round(wakeup.sleepMs / (1000 * 60 * 60) * 10) / 10;
        log(
          `Next: ${wakeup.session.raceName} ${wakeup.session.sessionName} ` +
          `at ${wakeup.session.startTime.toUTCString()}`,
        );
        log(`Sleeping ${hours}h until 1h before session...`);
        await sleep(wakeup.sleepMs);

        if (shutdownRequested) break;
        log(`Waking up for ${wakeup.session.raceName} ${wakeup.session.sessionName}`);
      } else {
        log(
          `Session window active: ${wakeup.session.raceName} ${wakeup.session.sessionName}`,
        );
      }

      // Phase 3: Poll for the live session to actually start
      const awakeDeadline = Date.now() + MAX_AWAKE_MS;
      let session = null;

      while (!shutdownRequested && Date.now() < awakeDeadline) {
        log("Checking for live session...");
        session = await discoverLiveSession();

        if (session && !session.isComplete) {
          break; // Session is live — proceed to stream
        }

        if (session?.isComplete) {
          log(`Session ${session.sessionKey} (${session.name}) is complete`);
        } else {
          log("Session not live yet, checking again in 60s...");
        }

        await sleep(DISCOVERY_POLL_MS);
      }

      if (!session || session.isComplete) {
        log("Session window passed without finding a live session");
        continue; // Go back to schedule check
      }

      // Phase 4: Connect and stream
      log(
        `Live session found: ${session.sessionKey} (${session.name} - ${session.type})`,
      );

      stateManager.reset();
      writer.resetForNewSession();

      const signalR = new SignalRClient((topic, data) => {
        stateManager.handleTopic(topic, data);
      });

      await signalR.connect();

      // Start periodic flush
      const flushTimer = setInterval(async () => {
        try {
          await writer.flush(stateManager, session!.sessionKey);
        } catch (err) {
          logError("Flush error:", err);
        }
      }, FLUSH_INTERVAL_MS);

      // Phase 5: Monitor session until it ends
      let sessionEnded = false;
      while (!shutdownRequested && !sessionEnded) {
        await sleep(DISCOVERY_POLL_MS);

        const current = await discoverLiveSession();
        if (!current || current.sessionKey !== session.sessionKey) {
          log(`Session ${session.sessionKey} is no longer live`);
          sessionEnded = true;
        } else if (current.isComplete) {
          log(`Session ${session.sessionKey} marked as complete`);
          sessionEnded = true;
        }
      }

      // Phase 6: Final flush + cleanup
      log("Performing final flush...");
      await sleep(SESSION_END_GRACE_MS);
      await writer.flush(stateManager, session.sessionKey);

      clearInterval(flushTimer);
      signalR.disconnect();

      log(`Session ${session.sessionKey} processing complete`);
      // Loop back to Phase 1 — fetch schedule again for the next session
    } catch (err) {
      logError("Main loop error:", err);
      await sleep(10_000);
    }
  }

  writer.close();
  log("Worker shut down cleanly");
}

main().catch((err) => {
  logError("Fatal error:", err);
  process.exit(1);
});
