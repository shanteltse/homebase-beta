export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { db } from "@/db";
import { users, tasks, calendarEvents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { handleApiError, ApiError } from "@/lib/api-error";
import { validateOrigin } from "@/lib/api-utils";
import {
  refreshAccessToken,
  createEvent,
  updateEvent,
  deleteEvent,
  taskToGCalEvent,
} from "@/lib/gcal";

export async function POST(request: Request) {
  try {
    if (!validateOrigin(request)) throw new ApiError(403, "Forbidden");

    const user = await getAuthUser(request);
    if (!user) throw new ApiError(401, "Unauthorized");

    // Fetch user with GCal credentials
    const [profile] = await db
      .select({
        gcalConnected: users.gcalConnected,
        gcalSyncEnabled: users.gcalSyncEnabled,
        gcalAccessToken: users.gcalAccessToken,
        gcalRefreshToken: users.gcalRefreshToken,
        gcalCalendarId: users.gcalCalendarId,
        gcalSyncWhat: users.gcalSyncWhat,
        gcalIncludeNotes: users.gcalIncludeNotes,
        gcalIncludeAssignee: users.gcalIncludeAssignee,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!profile?.gcalConnected || !profile.gcalSyncEnabled) {
      throw new ApiError(400, "Google Calendar not connected or sync disabled");
    }

    let accessToken = profile.gcalAccessToken;

    // Attempt token refresh if needed
    if (!accessToken && profile.gcalRefreshToken) {
      const refreshed = await refreshAccessToken(profile.gcalRefreshToken);
      if (refreshed) {
        accessToken = refreshed.accessToken;
        await db
          .update(users)
          .set({ gcalAccessToken: accessToken })
          .where(eq(users.id, user.id));
      }
    }

    if (!accessToken) {
      throw new ApiError(401, "Google Calendar token expired. Please reconnect.");
    }

    const calendarId = profile.gcalCalendarId ?? "primary";
    const appUrl = process.env.NEXTAUTH_URL ?? "";

    // Get all active tasks with due dates (apply sync filter)
    let taskQuery = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, user.id), eq(tasks.completed, false)));

    const userTasks = await taskQuery;

    const filteredTasks = userTasks.filter((t) => {
      if (profile.gcalSyncWhat === "starred") return t.starred;
      if (profile.gcalSyncWhat === "today_week") {
        if (!t.dueDate) return false;
        const dueMs = new Date(t.dueDate).getTime();
        const now = Date.now();
        const weekMs = 7 * 24 * 3600 * 1000;
        return dueMs >= now - 86400000 && dueMs <= now + weekMs;
      }
      return true;
    });

    // Get existing event mappings for this user
    const existingMappings = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.userId, user.id));

    const mappingByTaskId = new Map(existingMappings.map((m) => [m.taskId, m]));
    const mappedTaskIds = new Set(existingMappings.map((m) => m.taskId));
    const filteredTaskIds = new Set(filteredTasks.map((t) => t.id));

    let synced = 0;
    let errors = 0;

    // Sync tasks → Google Calendar
    for (const task of filteredTasks) {
      try {
        const gcalEvent = taskToGCalEvent(
          task,
          appUrl,
          task.id,
          profile.gcalIncludeNotes,
          profile.gcalIncludeAssignee,
        );

        const existing = mappingByTaskId.get(task.id);
        if (existing) {
          // Update existing event
          await updateEvent(accessToken, existing.gcalEventId, gcalEvent, calendarId);
          await db
            .update(calendarEvents)
            .set({ lastSyncedAt: new Date() })
            .where(eq(calendarEvents.id, existing.id));
        } else {
          // Create new event
          const created = await createEvent(accessToken, gcalEvent, calendarId);
          await db.insert(calendarEvents).values({
            userId: user.id,
            taskId: task.id,
            gcalEventId: created.id,
          });
        }
        synced++;
      } catch {
        errors++;
      }
    }

    // Remove events for tasks that no longer qualify or were deleted
    for (const mapping of existingMappings) {
      if (!filteredTaskIds.has(mapping.taskId)) {
        try {
          await deleteEvent(accessToken, mapping.gcalEventId, calendarId);
        } catch {
          // Event may already be deleted in Google Calendar
        }
        await db
          .delete(calendarEvents)
          .where(eq(calendarEvents.id, mapping.id));
      }
    }

    // Update last sync time
    await db
      .update(users)
      .set({ gcalLastSync: new Date() })
      .where(eq(users.id, user.id));

    return NextResponse.json({ synced, errors, total: filteredTasks.length });
  } catch (error) {
    return handleApiError(error);
  }
}
