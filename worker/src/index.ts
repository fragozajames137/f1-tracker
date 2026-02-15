import { log, logError, sleep } from "./utils.js";
import { fetchSchedule, findNextWakeup, logUpcoming } from "./schedule.js";
import { discoverLiveSession } from "./session-discovery.js";
import { SignalRClient } from "./signalr-client.js";
import { StateManager } from "./state-manager.js";
import { TursoWriter } from "./turso-writer.js";
import { ingestStaleSessions } from "./post-session-ingest.js";
import { persistLiveSnapshot } from "./persist-live-snapshot.js";
import { PushSender } from "./push-sender.js";
import { NotificationTriggers } from "./notification-triggers.js";
import type { RaceControlEntry } from "./types.js";

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
  const pushSender = new PushSender();
  const triggers = new NotificationTriggers();
  const sentReminders = new Set<string>();
  const sentPreviews = new Set<number>();

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
        log(
          `Next weekend: ${wakeup.session.raceName} ` +
          `at ${wakeup.session.startTime.toUTCString()}`,
        );

        // Check if we should wake briefly to send a race week preview (~48h before)
        const PREVIEW_BEFORE_MS = 48 * 60 * 60 * 1000;
        const previewTimeMs = wakeup.session.startTime.getTime() - PREVIEW_BEFORE_MS;
        const wakeTimeMs = wakeup.session.startTime.getTime() - 60 * 60 * 1000;
        const nowMs = Date.now();

        if (nowMs < previewTimeMs && previewTimeMs < wakeTimeMs) {
          const previewSleepMs = previewTimeMs - nowMs;
          const previewHours = Math.round(previewSleepMs / (1000 * 60 * 60) * 10) / 10;
          log(`Sleeping ${previewHours}h until race week preview...`);
          await sleep(previewSleepMs);

          if (!shutdownRequested) {
            try {
              const preview = triggers.checkRaceWeekPreview(schedule, sentPreviews);
              if (preview) {
                await pushSender.sendToAll(preview, { reminders: true });
                log(`Sent race week preview for ${wakeup.session.raceName}`);
              }
            } catch (err) {
              logError("Race week preview error (non-fatal):", err);
            }
          }
        }

        // Sleep remaining time until 1h before first session
        const remainingMs = Math.max(0, wakeTimeMs - Date.now());
        if (remainingMs > 0) {
          const hours = Math.round(remainingMs / (1000 * 60 * 60) * 10) / 10;
          log(`Sleeping ${hours}h until 1h before weekend...`);
          await sleep(remainingMs);
        }

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
          // Check for session reminders while waiting
          try {
            const reminderPayloads = triggers.checkSessionReminders(schedule, sentReminders);
            for (const p of reminderPayloads) {
              await pushSender.sendToAll(p, { reminders: true });
            }
          } catch (err) {
            logError("Session reminder error (non-fatal):", err);
          }

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
        let prevRCMessages: RaceControlEntry[] = [];

        const signalR = new SignalRClient((topic, data) => {
          stateManager.handleTopic(topic, data);
        });

        await signalR.connect();

        // Start periodic flush
        const flushTimer = setInterval(async () => {
          try {
            await writer.flush(stateManager, session!.sessionKey);

            // Check for notification-worthy race control events
            const currentRC = stateManager.getState().raceControlMessages;
            const rcPayloads = triggers.checkRaceControl(prevRCMessages, currentRC);
            for (const p of rcPayloads) {
              await pushSender.sendToAll(p, { liveEvents: true });
            }
            prevRCMessages = [...currentRC];
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

        // Persist the final live snapshot to normalized tables
        try {
          await persistLiveSnapshot(session.sessionKey);
        } catch (err) {
          logError("Failed to persist live snapshot (non-fatal):", err);
        }

        // Send post-race results notification if this was a Race or Sprint
        if (session.type === "Race" || session.type === "Sprint Race") {
          try {
            const postRace = triggers.buildPostRaceNotification(
              stateManager.getState(),
              session.sessionKey,
              session.name,
            );
            if (postRace) {
              await pushSender.sendToAll(postRace, { liveEvents: true });
              log(`Sent post-race results notification`);
            }
          } catch (err) {
            logError("Post-race notification error (non-fatal):", err);
          }
        }

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
