import type { RaceControlEntry } from "./types.js";
import type { AccumulatedState } from "./state-manager.js";
import type { ScheduledSession } from "./schedule.js";
import type { NotificationPayload } from "./push-sender.js";
import { translatePositions, translateDrivers } from "./translators/index.js";

// ---------------------------------------------------------------------------
// NotificationTriggers — detects events worthy of push notifications
// ---------------------------------------------------------------------------

// Only notify for these session types (skip FP1/FP2/FP3 — too noisy)
const REMINDER_SESSION_TYPES = new Set([
  "Qualifying",
  "Sprint Qualifying",
  "Sprint",
  "Race",
]);

const PREVIEW_BEFORE_MS = 48 * 60 * 60 * 1000; // 48h before first session

export class NotificationTriggers {
  // -----------------------------------------------------------------------
  // Session reminders
  // -----------------------------------------------------------------------

  checkSessionReminders(
    schedule: ScheduledSession[],
    sentReminders: Set<string>,
    reminderMinutes = 15,
  ): NotificationPayload[] {
    const now = Date.now();
    const payloads: NotificationPayload[] = [];

    for (const session of schedule) {
      if (!REMINDER_SESSION_TYPES.has(session.sessionName)) continue;

      const key = `${session.round}_${session.sessionName}`;
      if (sentReminders.has(key)) continue;

      const msUntilStart = session.startTime.getTime() - now;
      const reminderWindowMs = reminderMinutes * 60 * 1000;

      // Fire if we're within the reminder window but session hasn't started yet
      if (msUntilStart > 0 && msUntilStart <= reminderWindowMs) {
        sentReminders.add(key);

        const timeStr = session.startTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
          hour12: false,
        });

        payloads.push({
          title: `${session.sessionName} starts in ${reminderMinutes} min`,
          body: `${session.raceName} — ${session.sessionName} at ${timeStr} UTC`,
          tag: `reminder-${session.round}-${session.sessionName}`,
          url: "/schedule",
        });
      }
    }

    return payloads;
  }

  // -----------------------------------------------------------------------
  // Race control events
  // -----------------------------------------------------------------------

  checkRaceControl(
    prevMessages: RaceControlEntry[],
    currentMessages: RaceControlEntry[],
  ): NotificationPayload[] {
    // Find new messages (ones that weren't in the previous set)
    const prevCount = prevMessages.length;
    if (currentMessages.length <= prevCount) return [];

    const newMessages = currentMessages.slice(prevCount);
    const payloads: NotificationPayload[] = [];

    for (const msg of newMessages) {
      const payload = this.classifyRCMessage(msg);
      if (payload) payloads.push(payload);
    }

    return payloads;
  }

  private classifyRCMessage(
    msg: RaceControlEntry,
  ): NotificationPayload | null {
    const message = msg.Message ?? "";
    const flag = msg.Flag ?? "";
    const lapInfo = msg.Lap ? ` on lap ${msg.Lap}` : "";

    // Red flag — highest priority
    if (flag === "RED") {
      return {
        title: "RED FLAG — Session Stopped",
        body: `Red flag shown${lapInfo}`,
        tag: `rc-redflag-${msg.Utc}`,
        url: "/live",
      };
    }

    // Virtual safety car (check before SC — "VIRTUAL SAFETY CAR" contains "SAFETY CAR")
    if (
      message.includes("VIRTUAL SAFETY CAR DEPLOYED") ||
      message.includes("VIRTUAL SAFETY CAR HAS BEEN DEPLOYED")
    ) {
      return {
        title: "Virtual Safety Car",
        body: `VSC deployed${lapInfo}`,
        tag: `rc-vsc-${msg.Utc}`,
        url: "/live",
      };
    }

    // Safety car
    if (
      message.includes("SAFETY CAR DEPLOYED") ||
      message.includes("SAFETY CAR HAS BEEN DEPLOYED")
    ) {
      return {
        title: "Safety Car Deployed",
        body: `Safety car deployed${lapInfo}`,
        tag: `rc-sc-${msg.Utc}`,
        url: "/live",
      };
    }

    // Session start (green light)
    if (
      message.includes("GREEN LIGHT") ||
      message.includes("PIT LANE OPEN")
    ) {
      // Only notify for the first green light (session start)
      if (message.includes("GREEN LIGHT")) {
        return {
          title: "Session Started",
          body: `Green light — session is live!`,
          tag: `rc-green-${msg.Utc}`,
          url: "/live",
        };
      }
    }

    // Chequered flag
    if (flag === "CHEQUERED") {
      return {
        title: "Chequered Flag",
        body: `Session has ended${lapInfo}`,
        tag: `rc-chequered-${msg.Utc}`,
        url: "/live",
      };
    }

    return null;
  }

  // -----------------------------------------------------------------------
  // Race week preview — sent ~48h before the first session of a weekend
  // -----------------------------------------------------------------------

  checkRaceWeekPreview(
    schedule: ScheduledSession[],
    sentPreviews: Set<number>,
  ): NotificationPayload | null {
    const now = Date.now();

    // Group sessions by round and find the next weekend
    const rounds = new Map<number, ScheduledSession[]>();
    for (const s of schedule) {
      if (!rounds.has(s.round)) rounds.set(s.round, []);
      rounds.get(s.round)!.push(s);
    }

    for (const [round, sessions] of rounds) {
      if (sentPreviews.has(round)) continue;

      const firstSession = sessions[0];
      const msUntilStart = firstSession.startTime.getTime() - now;

      // Fire if we're within the 48h preview window
      if (msUntilStart > 0 && msUntilStart <= PREVIEW_BEFORE_MS) {
        sentPreviews.add(round);

        const dayStr = firstSession.startTime.toLocaleDateString("en-US", {
          weekday: "long",
          timeZone: "UTC",
        });
        const timeStr = firstSession.startTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
          hour12: false,
        });

        return {
          title: `${sessions[0].raceName} this weekend!`,
          body: `${firstSession.sessionName} starts ${dayStr} at ${timeStr} UTC`,
          tag: `preview-${round}`,
          url: "/schedule",
        };
      }
    }

    return null;
  }

  // -----------------------------------------------------------------------
  // Post-race results — sent after chequered flag with winner name
  // -----------------------------------------------------------------------

  buildPostRaceNotification(
    state: AccumulatedState,
    sessionKey: number,
    raceName: string,
  ): NotificationPayload | null {
    const positions = translatePositions(state, sessionKey);
    const drivers = translateDrivers(state, sessionKey);

    if (positions.length === 0 || drivers.length === 0) return null;

    // Find P1
    const p1 = positions.find((p) => p.position === 1);
    if (!p1) return null;

    const winner = drivers.find((d) => d.driver_number === p1.driver_number);
    const winnerName = winner?.full_name ?? winner?.name_acronym ?? `#${p1.driver_number}`;

    return {
      title: `${winnerName} wins the ${raceName}!`,
      body: "Full results and analysis available now",
      tag: `results-${sessionKey}`,
      url: "/race",
    };
  }
}
