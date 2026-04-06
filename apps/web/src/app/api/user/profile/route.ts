export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handleApiError, ApiError } from "@/lib/api-error";

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      onboardingCompleted: users.onboardingCompleted,
      onboardingStep: users.onboardingStep,
      notificationDailyRecap: users.notificationDailyRecap,
      notificationRecapTime: users.notificationRecapTime,
      notificationMorningSummary: users.notificationMorningSummary,
      notificationTaskReminders: users.notificationTaskReminders,
      gcalConnected: users.gcalConnected,
      gcalSyncEnabled: users.gcalSyncEnabled,
      gcalSyncFrequency: users.gcalSyncFrequency,
      gcalSyncWhat: users.gcalSyncWhat,
      gcalIncludeNotes: users.gcalIncludeNotes,
      gcalIncludeAssignee: users.gcalIncludeAssignee,
      gcalLastSync: users.gcalLastSync,
      voiceInputEnabled: users.voiceInputEnabled,
      voiceInputLanguage: users.voiceInputLanguage,
      voiceInputAutoSubmit: users.voiceInputAutoSubmit,
      showStatsOnDashboard: users.showStatsOnDashboard,
      showTaskSummaryOnDashboard: users.showTaskSummaryOnDashboard,
      showGcalEvents: users.showGcalEvents,
      reminderDailyEnabled: users.reminderDailyEnabled,
      reminderDailyTime: users.reminderDailyTime,
      reminderWeeklyEnabled: users.reminderWeeklyEnabled,
      reminderWeeklyTime: users.reminderWeeklyTime,
      pwaInstalled: users.pwaInstalled,
    })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(profile);
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      throw new ApiError(401, "Unauthorized");
    }

    const body = await request.json();

    // Allowlist of updatable fields
    const updatable: Partial<typeof users.$inferInsert> = {};
    if (typeof body.name === "string") updatable.name = body.name.trim().slice(0, 100);
    if (typeof body.image === "string") updatable.image = body.image;
    if (typeof body.onboardingStep === "number") updatable.onboardingStep = body.onboardingStep;
    if (typeof body.notificationDailyRecap === "boolean") updatable.notificationDailyRecap = body.notificationDailyRecap;
    if (typeof body.notificationRecapTime === "string") updatable.notificationRecapTime = body.notificationRecapTime;
    if (typeof body.notificationMorningSummary === "boolean") updatable.notificationMorningSummary = body.notificationMorningSummary;
    if (typeof body.notificationTaskReminders === "boolean") updatable.notificationTaskReminders = body.notificationTaskReminders;
    if (typeof body.gcalSyncEnabled === "boolean") updatable.gcalSyncEnabled = body.gcalSyncEnabled;
    if (typeof body.gcalSyncFrequency === "string") updatable.gcalSyncFrequency = body.gcalSyncFrequency as "realtime" | "hourly" | "twice_daily";
    if (typeof body.gcalSyncWhat === "string") updatable.gcalSyncWhat = body.gcalSyncWhat as "all" | "starred" | "today_week";
    if (typeof body.gcalIncludeNotes === "boolean") updatable.gcalIncludeNotes = body.gcalIncludeNotes;
    if (typeof body.gcalIncludeAssignee === "boolean") updatable.gcalIncludeAssignee = body.gcalIncludeAssignee;
    if (typeof body.voiceInputEnabled === "boolean") updatable.voiceInputEnabled = body.voiceInputEnabled;
    if (typeof body.voiceInputLanguage === "string") updatable.voiceInputLanguage = body.voiceInputLanguage;
    if (typeof body.voiceInputAutoSubmit === "boolean") updatable.voiceInputAutoSubmit = body.voiceInputAutoSubmit;
    if (typeof body.showStatsOnDashboard === "boolean") updatable.showStatsOnDashboard = body.showStatsOnDashboard;
    if (typeof body.showTaskSummaryOnDashboard === "boolean") updatable.showTaskSummaryOnDashboard = body.showTaskSummaryOnDashboard;
    if (typeof body.showGcalEvents === "boolean") updatable.showGcalEvents = body.showGcalEvents;
    if (typeof body.reminderDailyEnabled === "boolean") updatable.reminderDailyEnabled = body.reminderDailyEnabled;
    if (typeof body.reminderDailyTime === "string") updatable.reminderDailyTime = body.reminderDailyTime;
    if (typeof body.reminderWeeklyEnabled === "boolean") updatable.reminderWeeklyEnabled = body.reminderWeeklyEnabled;
    if (typeof body.reminderWeeklyTime === "string") updatable.reminderWeeklyTime = body.reminderWeeklyTime;
    if (body.pwaInstalled === true) updatable.pwaInstalled = true;

    if (Object.keys(updatable).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(users)
      .set(updatable)
      .where(eq(users.id, user.id))
      .returning({ id: users.id });

    return NextResponse.json({ id: updated?.id });
  } catch (error) {
    return handleApiError(error);
  }
}
