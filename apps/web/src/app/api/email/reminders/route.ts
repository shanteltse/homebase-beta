import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserHouseholdId } from "@/lib/get-user-household";
import { generateDailyReminderHtml, generateWeeklyReminderHtml } from "@/lib/email-templates";
import { sendEmail } from "@/lib/send-email";

/**
 * POST /api/email/reminders
 *
 * Sends daily and weekly reminder emails to users who have opted in.
 * Called by Vercel Cron once daily at midnight UTC.
 *
 * Cron schedule (vercel.json):
 *   { "path": "/api/email/reminders", "schedule": "0 0 * * *" }
 *
 * Authorization: Bearer ${CRON_SECRET}
 *
 * Daily reminders: sent to all users with reminderDailyEnabled === true.
 * Weekly reminders: sent on Mondays only (UTC), to users with reminderWeeklyEnabled === true.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const now = new Date();
  const utcDay = now.getUTCDay();
  const isMonday = utcDay === 1;

  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

  // End of this week (Sunday 23:59:59 UTC)
  const daysUntilSunday = utcDay === 0 ? 7 : 7 - utcDay;
  const weekEnd = new Date(todayStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + daysUntilSunday + 1); // exclusive upper bound

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      reminderDailyEnabled: users.reminderDailyEnabled,
      reminderWeeklyEnabled: users.reminderWeeklyEnabled,
    })
    .from(users);

  const results: { email: string; type: string; count: number }[] = [];
  const errors: { email: string; type: string; error: string }[] = [];

  for (const user of allUsers) {
    // --- Daily reminder ---
    if (user.reminderDailyEnabled) {
      const householdId = await getUserHouseholdId(user.id);
      const scopeCondition = householdId
        ? and(eq(tasks.householdId, householdId), eq(tasks.completed, false))
        : and(eq(tasks.userId, user.id), eq(tasks.completed, false));

      const allIncompleteTasks = await db
        .select({ title: tasks.title, dueDate: tasks.dueDate })
        .from(tasks)
        .where(scopeCondition);

      const dueToday: string[] = [];
      const overdue: string[] = [];
      const comingUp: string[] = [];
      const noDate: string[] = [];

      for (const t of allIncompleteTasks) {
        if (!t.dueDate) {
          noDate.push(t.title);
        } else {
          const d = new Date(t.dueDate);
          if (d >= todayStart && d < todayEnd) {
            dueToday.push(t.title);
          } else if (d < todayStart) {
            overdue.push(t.title);
          } else {
            comingUp.push(t.title);
          }
        }
      }

      const html = generateDailyReminderHtml({
        userName: user.name,
        userEmail: user.email,
        appUrl,
        dueToday,
        overdue,
        comingUp,
        noDate,
      });

      try {
        await sendEmail({
          to: user.email,
          subject: "Your HomeBase daily reminder",
          html,
        });
        console.log(
          `[reminders/daily] sent to ${user.email} — overdue: ${overdue.length}, today: ${dueToday.length}, coming up: ${comingUp.length}, no date: ${noDate.length}`,
        );
        results.push({ email: user.email, type: "daily", count: allIncompleteTasks.length });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[reminders/daily] failed for ${user.email}:`, msg);
        errors.push({ email: user.email, type: "daily", error: msg });
      }
    }

    // --- Weekly reminder (Mondays only) ---
    if (isMonday && user.reminderWeeklyEnabled) {
      const householdId = await getUserHouseholdId(user.id);
      const scopeCondition = householdId
        ? and(eq(tasks.householdId, householdId), eq(tasks.completed, false))
        : and(eq(tasks.userId, user.id), eq(tasks.completed, false));

      const allIncompleteTasks = await db
        .select({ title: tasks.title, dueDate: tasks.dueDate })
        .from(tasks)
        .where(scopeCondition);

      const dueThisWeek: string[] = [];
      const overdue: string[] = [];
      const comingUp: string[] = [];
      const noDate: string[] = [];

      for (const t of allIncompleteTasks) {
        if (!t.dueDate) {
          noDate.push(t.title);
        } else {
          const d = new Date(t.dueDate);
          if (d >= todayStart && d < weekEnd) {
            dueThisWeek.push(t.title);
          } else if (d < todayStart) {
            overdue.push(t.title);
          } else {
            comingUp.push(t.title);
          }
        }
      }

      const html = generateWeeklyReminderHtml({
        userName: user.name,
        userEmail: user.email,
        appUrl,
        dueThisWeek,
        overdue,
        comingUp,
        noDate,
      });

      try {
        await sendEmail({
          to: user.email,
          subject: "Your HomeBase weekly reminder",
          html,
        });
        console.log(
          `[reminders/weekly] sent to ${user.email} — overdue: ${overdue.length}, this week: ${dueThisWeek.length}, coming up: ${comingUp.length}, no date: ${noDate.length}`,
        );
        results.push({ email: user.email, type: "weekly", count: allIncompleteTasks.length });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[reminders/weekly] failed for ${user.email}:`, msg);
        errors.push({ email: user.email, type: "weekly", error: msg });
      }
    }
  }

  return NextResponse.json({ sent: results.length, results, errors });
}
