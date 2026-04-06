export const dynamic = "force-dynamic";

/**
 * Google Calendar push notification webhook.
 *
 * Google sends a POST to this endpoint whenever a watched calendar changes.
 * We receive the notification and trigger a sync for the affected user.
 *
 * Google Calendar watch channels are registered via:
 *   POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/watch
 *
 * The X-Goog-Channel-Token header contains the userId we stored when registering.
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, tasks, calendarEvents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { refreshAccessToken, getEvent } from "@/lib/gcal";

export async function POST(request: Request) {
  const channelToken = request.headers.get("X-Goog-Channel-Token");
  const resourceState = request.headers.get("X-Goog-Resource-State");

  // Acknowledge the webhook immediately
  if (resourceState === "sync") {
    return new NextResponse(null, { status: 200 });
  }

  if (!channelToken) {
    return new NextResponse(null, { status: 200 });
  }

  // channelToken is the userId
  const userId = channelToken;

  try {
    const [profile] = await db
      .select({
        gcalConnected: users.gcalConnected,
        gcalAccessToken: users.gcalAccessToken,
        gcalRefreshToken: users.gcalRefreshToken,
        gcalCalendarId: users.gcalCalendarId,
        gcalIncludeNotes: users.gcalIncludeNotes,
        gcalIncludeAssignee: users.gcalIncludeAssignee,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!profile?.gcalConnected) {
      return new NextResponse(null, { status: 200 });
    }

    let accessToken = profile.gcalAccessToken;
    if (!accessToken && profile.gcalRefreshToken) {
      const refreshed = await refreshAccessToken(profile.gcalRefreshToken);
      if (refreshed) {
        accessToken = refreshed.accessToken;
        await db.update(users).set({ gcalAccessToken: accessToken }).where(eq(users.id, userId));
      }
    }

    if (!accessToken) {
      return new NextResponse(null, { status: 200 });
    }

    const calendarId = profile.gcalCalendarId ?? "primary";

    // Fetch updated events from the calendar and sync back to tasks
    const mappings = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.userId, userId));

    for (const mapping of mappings) {
      try {
        const gcalEvent = await getEvent(accessToken, mapping.gcalEventId, calendarId);

        if (!gcalEvent) {
          // Event was deleted in Google Calendar — delete task
          await db.delete(tasks).where(
            and(eq(tasks.id, mapping.taskId), eq(tasks.userId, userId)),
          );
          await db.delete(calendarEvents).where(eq(calendarEvents.id, mapping.id));
          continue;
        }

        // Sync changes back to task
        const updates: Partial<typeof tasks.$inferInsert> = {};

        if (gcalEvent.summary) {
          updates.title = gcalEvent.summary;
        }

        const dateStr = gcalEvent.start.dateTime ?? gcalEvent.start.date;
        if (dateStr) {
          updates.dueDate = new Date(dateStr);
        }

        if (gcalEvent.status === "cancelled") {
          updates.completed = true;
          updates.completedAt = new Date();
        }

        if (Object.keys(updates).length > 0) {
          await db
            .update(tasks)
            .set({ ...updates, updatedAt: new Date() })
            .where(and(eq(tasks.id, mapping.taskId), eq(tasks.userId, userId)));
        }

        await db
          .update(calendarEvents)
          .set({ lastSyncedAt: new Date() })
          .where(eq(calendarEvents.id, mapping.id));
      } catch {
        // Continue processing other mappings on error
      }
    }

    await db.update(users).set({ gcalLastSync: new Date() }).where(eq(users.id, userId));
  } catch {
    // Fail silently — Google expects 200 responses
  }

  return new NextResponse(null, { status: 200 });
}
