import webpush from "web-push";
import { createClient } from "@libsql/client";
import { log, logError } from "./utils.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
}

interface Subscription {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  notifyReminders: number;
  notifyLiveEvents: number;
  reminderMinutes: number;
}

// ---------------------------------------------------------------------------
// PushSender — sends Web Push notifications to all matching subscribers
// ---------------------------------------------------------------------------

export class PushSender {
  private configured: boolean;
  private lastSentByTag = new Map<string, number>();
  private readonly MIN_GAP_MS = 30_000; // 30s between notifications of same tag prefix

  constructor() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT ?? "mailto:noreply@poletopaddock.com";

    if (!publicKey || !privateKey) {
      log("VAPID keys not set — push notifications disabled");
      this.configured = false;
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.configured = true;
    log("Push notifications configured");
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async sendToAll(
    payload: NotificationPayload,
    filter: { reminders?: boolean; liveEvents?: boolean },
  ): Promise<void> {
    if (!this.configured) return;

    // Rate-limit by tag prefix
    if (payload.tag) {
      const prefix = payload.tag.replace(/-\d+$/, "");
      const lastSent = this.lastSentByTag.get(prefix) ?? 0;
      if (Date.now() - lastSent < this.MIN_GAP_MS) {
        return;
      }
      this.lastSentByTag.set(prefix, Date.now());
    }

    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    try {
      // Build filter query
      const conditions: string[] = [];
      if (filter.reminders) conditions.push("notify_reminders = 1");
      if (filter.liveEvents) conditions.push("notify_live_events = 1");

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" OR ")}` : "";

      const result = await client.execute(
        `SELECT id, endpoint, p256dh, auth, notify_reminders, notify_live_events, reminder_minutes
         FROM push_subscriptions ${whereClause}`,
      );

      const subs = result.rows as unknown as Subscription[];
      if (subs.length === 0) return;

      log(`Sending push "${payload.title}" to ${subs.length} subscribers`);

      const jsonPayload = JSON.stringify(payload);
      const staleIds: number[] = [];

      const results = await Promise.allSettled(
        subs.map(async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              jsonPayload,
            );
          } catch (err: unknown) {
            const statusCode = (err as { statusCode?: number }).statusCode;
            if (statusCode === 410 || statusCode === 404) {
              staleIds.push(sub.id);
            } else {
              throw err;
            }
          }
        }),
      );

      // Clean up stale subscriptions
      if (staleIds.length > 0) {
        const placeholders = staleIds.map(() => "?").join(",");
        await client.execute({
          sql: `DELETE FROM push_subscriptions WHERE id IN (${placeholders})`,
          args: staleIds,
        });
        log(`Removed ${staleIds.length} stale push subscriptions`);
      }

      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        logError(`${failed} push notifications failed to send`);
      }
    } catch (err) {
      logError("Push send error:", err);
    } finally {
      client.close();
    }
  }

  /**
   * Get the minimum reminder minutes across all subscribers who want reminders.
   * Used to determine when to start checking for upcoming sessions.
   */
  async getMinReminderMinutes(): Promise<number> {
    if (!this.configured) return 15;

    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    try {
      const result = await client.execute(
        "SELECT MIN(reminder_minutes) as min_minutes FROM push_subscriptions WHERE notify_reminders = 1",
      );
      const min = result.rows[0]?.min_minutes as number | null;
      return min ?? 15;
    } finally {
      client.close();
    }
  }
}
