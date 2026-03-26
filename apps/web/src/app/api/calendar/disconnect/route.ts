export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { db } from "@/db";
import { users, calendarEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handleApiError, ApiError } from "@/lib/api-error";
import { validateOrigin } from "@/lib/api-utils";

export async function POST(request: Request) {
  try {
    if (!validateOrigin(request)) throw new ApiError(403, "Forbidden");

    const user = await getAuthUser(request);
    if (!user) throw new ApiError(401, "Unauthorized");

    // Remove all calendar event mappings
    await db.delete(calendarEvents).where(eq(calendarEvents.userId, user.id));

    // Clear GCal credentials and reset settings
    await db
      .update(users)
      .set({
        gcalConnected: false,
        gcalSyncEnabled: false,
        gcalAccessToken: null,
        gcalRefreshToken: null,
        gcalCalendarId: null,
        gcalLastSync: null,
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
