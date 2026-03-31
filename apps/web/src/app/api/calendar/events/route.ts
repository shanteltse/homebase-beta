export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { db } from "@/db";
import { users, calendarEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handleApiError } from "@/lib/api-error";
import { refreshAccessToken, listEvents } from "@/lib/gcal";

export type GCalExternalEvent = {
  id: string;
  title: string;
  /** ISO datetime string (e.g. "2026-04-01T14:00:00Z") or YYYY-MM-DD for all-day */
  start: string;
  /** ISO datetime string or YYYY-MM-DD for all-day */
  end: string;
  allDay: boolean;
};

/**
 * GET /api/calendar/events
 *
 * Fetches events from the user's connected Google Calendar and returns them
 * after filtering out any events that originated from HomeBase (identified
 * via the calendarEvents mapping table).
 *
 * Returns an empty array if GCal is not connected or sync is disabled.
 */
export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user credentials and settings
    const [profile] = await db
      .select({
        gcalConnected: users.gcalConnected,
        gcalSyncEnabled: users.gcalSyncEnabled,
        gcalAccessToken: users.gcalAccessToken,
        gcalRefreshToken: users.gcalRefreshToken,
        gcalCalendarId: users.gcalCalendarId,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    // Not connected or sync disabled — return empty list gracefully
    if (!profile?.gcalConnected || !profile.gcalSyncEnabled) {
      return NextResponse.json([] as GCalExternalEvent[]);
    }

    let accessToken = profile.gcalAccessToken;

    // Refresh token if access token is missing
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
      // Credentials expired — return empty rather than an error so the
      // calendar still renders with tasks
      return NextResponse.json([] as GCalExternalEvent[]);
    }

    const calendarId = profile.gcalCalendarId ?? "primary";

    // Fetch ±60 days so month, week, and day views are all covered without
    // needing a refetch on every navigation
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 60);
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 60);

    const rawEvents = await listEvents(accessToken, calendarId, {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 500,
    });

    // Get all gcalEventIds that originated from HomeBase so we can exclude them
    const mappings = await db
      .select({ gcalEventId: calendarEvents.gcalEventId })
      .from(calendarEvents)
      .where(eq(calendarEvents.userId, user.id));

    const homebaseEventIds = new Set(mappings.map((m) => m.gcalEventId));

    // Normalize and filter
    const externalEvents: GCalExternalEvent[] = rawEvents
      .filter((e) => {
        // Exclude HomeBase-originated events
        if (homebaseEventIds.has(e.id)) return false;
        // Exclude cancelled events
        if (e.status === "cancelled") return false;
        // Must have a start time
        if (!e.start.dateTime && !e.start.date) return false;
        return true;
      })
      .map((e) => {
        const allDay = !e.start.dateTime;
        return {
          id: e.id,
          title: e.summary ?? "(No title)",
          start: e.start.dateTime ?? e.start.date!,
          end: e.end.dateTime ?? e.end.date!,
          allDay,
        };
      });

    return NextResponse.json(externalEvents);
  } catch (error) {
    return handleApiError(error);
  }
}
