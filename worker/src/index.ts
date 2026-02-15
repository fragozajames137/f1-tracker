import { log, logError, sleep } from "./utils.js";
import { fetchSchedule, findNextWakeup, logUpcoming } from "./schedule.js";
import { discoverLiveSession } from "./session-discovery.js";
import { SignalRClient } from "./signalr-client.js";
import { StateManager } from "./state-manager.js";
import { TursoWriter } from "./turso-writer.js";
import { ingestStaleSessions } from "./post-session-ingest.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DISCOVERY_POLL_MS = 60_000;     // Check for live session every 60s (once awake)
const FLUSH_INTERVAL_MS = 5_000;      // Flush to Turso every 5s
const SESSION_END_GRACE_MS = 30_000;  // Wait 30s after session ends before stopping
const SCHEDULE_RETRY_MS = 600_000;    // Retry schedule fetch every 10min on failure

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

  // Ingest any stale sessions from previous weekends before doing anything else
  await ingestStaleSessions();

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

      // Phase 2: Find the next race weekend
      const wakeup = findNextWakeup(schedule);
      if (!wakeup) {
        log("No more sessions this season. Exiting — machine will stop.");
        break;
      }

      if (wakeup.sleepMs > 0) {
        const hours = Math.round(wakeup.sleepMs / (1000 * 60 * 60) * 10) / 10;
        log(
          `Next weekend: ${wakeup.session.raceName} ` +
          `at ${wakeup.session.startTime.toUTCString()}`,
        );
        log(`Sleeping ${hours}h until 1h before weekend...`);
        await sleep(wakeup.sleepMs);

        if (shutdownRequested) break;
        log(`Waking up for ${wakeup.session.raceName} weekend`);
      } else {
        log(
          `Weekend active: ${wakeup.session.raceName}`,
        );
      }

      // Phase 3: Stay awake for the entire race weekend
      // Keep polling for sessions until the weekend is over
      const weekendEndMs = wakeup.weekendEndMs;

      while (!shutdownRequested && Date.now() < weekendEndMs) {
        // Poll for a live session
        log("Checking for live session...");
        let session = await discoverLiveSession();

        if (session?.isComplete) {
          log(`Session ${session.sessionKey} (${session.name}) is already complete`);
          session = null;
        }

        if (!session) {
          // No live session right now — wait and check again
          const remainingMs = weekendEndMs - Date.now();
          const remainingHours = Math.round(remainingMs / (1000 * 60 * 60) * 10) / 10;
          log(`No live session. Weekend ends in ${remainingHours}h. Checking again in 60s...`);
          await sleep(DISCOVERY_POLL_MS);
          continue;
        }

        // Found a live session — stream it
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

        // Monitor session until it ends
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

        // Final flush + cleanup for this session
        log("Performing final flush...");
        await sleep(SESSION_END_GRACE_MS);
        await writer.flush(stateManager, session.sessionKey);

        clearInterval(flushTimer);
        signalR.disconnect();

        log(`Session ${session.sessionKey} processing complete`);

        // Stay in the weekend loop to catch the next session
        log("Staying awake for next session in this weekend...");
      }

      log("Race weekend complete. Exiting — machine will stop until next weekend.");
      break;
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
