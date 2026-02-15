import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// pushSubscriptions — Web Push API subscriptions for notifications
// ---------------------------------------------------------------------------
export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    notifyReminders: integer("notify_reminders", { mode: "boolean" })
      .notNull()
      .default(true),
    notifyLiveEvents: integer("notify_live_events", { mode: "boolean" })
      .notNull()
      .default(true),
    reminderMinutes: integer("reminder_minutes").notNull().default(15),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    uniqueIndex("push_subscriptions_endpoint_idx").on(table.endpoint),
  ],
);
