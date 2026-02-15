import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, preferences } = body;

    if (
      !subscription?.endpoint ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      return NextResponse.json(
        { error: "Invalid push subscription" },
        { status: 400 },
      );
    }

    const db = getDb();
    const now = new Date().toISOString();

    // Upsert: insert or update on conflict
    const existing = await db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(pushSubscriptions)
        .set({
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          notifyReminders: preferences?.reminders ?? true,
          notifyLiveEvents: preferences?.liveEvents ?? true,
          reminderMinutes: preferences?.reminderMinutes ?? 15,
          updatedAt: now,
        })
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
    } else {
      await db.insert(pushSubscriptions).values({
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        notifyReminders: preferences?.reminders ?? true,
        notifyLiveEvents: preferences?.liveEvents ?? true,
        reminderMinutes: preferences?.reminderMinutes ?? 15,
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
