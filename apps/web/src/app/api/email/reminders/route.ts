import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserHouseholdId } from "@/lib/get-user-household";
import { generateReminderHtml } from "@/lib/email-templates";

/**
 * POST /api/email/reminders
 *
 * Sends daily and weekly reminder emails to users who have opted in.
 * Designed to be called by Vercel Cron every hour on the hour.
 *
 * Cron schedule (vercel.json):
 *   { "path": "/api/email/reminders", "schedule": "0 * * * *" }
 *
 * Authorization: Bearer ${CRON_SECRET}
 *
 * Daily reminders: sent to users whose reminderDailyTime hour matches the current UTC hour.
 * Weekly reminders: sent on Mondays only, same hour matching.
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
  const currentHour = now.getUTCHours();
  const currentHourStr = String(currentHour).padStart(2, "0");
  const utcDay = now.getUTCDay();
  const isMonday = utcDay === 1 || (utcDay === 0 && now.getUTCHours() >= 12) || (utcDay === 2 && now.getUTCHours() < 12);

  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

  // End of this week (Sunday 23:59:59 UTC)
  const daysUntilSunday = now.getUTCDay() === 0 ? 7 : 7 - now.getUTCDay();
  const weekEnd = new Date(todayStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + daysUntilSunday + 1); // exclusive upper bound

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      reminderDailyEnabled: users.reminderDailyEnabled,
      reminderDailyTime: users.reminderDailyTime,
      reminderWeeklyEnabled: users.reminderWeeklyEnabled,
      reminderWeeklyTime: users.reminderWeeklyTime,
    })
    .from(users);

  const results: { email: string; type: string; count: number }[] = [];

  for (const user of allUsers) {
    // --- Daily reminder ---
    if (user.reminderDailyEnabled) {
      const userHour = user.reminderDailyTime.slice(0, 2);
      if (userHour === currentHourStr) {
        const householdId = await getUserHouseholdId(user.id);
        const scopeCondition = householdId
          ? and(eq(tasks.householdId, householdId), eq(tasks.completed, false))
          : and(eq(tasks.userId, user.id), eq(tasks.completed, false));

        const todayTasks = await db
          .select({ title: tasks.title, dueDate: tasks.dueDate })
          .from(tasks)
          .where(scopeCondition);

        const dueTodayTasks = todayTasks.filter((t) => {
          if (!t.dueDate) return false;
          const d = new Date(t.dueDate);
          return d >= todayStart && d < todayEnd;
        });

        if (dueTodayTasks.length > 0) {
          const html = generateReminderHtml({
            userName: user.name,
            userEmail: user.email,
            taskTitles: dueTodayTasks.map((t) => t.title),
            appUrl,
            type: "daily",
          });

          // TODO: send email via Resend/SendGrid
          // await sendEmail({ to: user.email, subject: `You have ${dueTodayTasks.length} task(s) due today`, html });
          console.log(`[reminders/daily] ${user.email}: ${dueTodayTasks.length} tasks due today`);
          void html;

          results.push({ email: user.email, type: "daily", count: dueTodayTasks.length });
        }
      }
    }

    // --- Weekly reminder (Mondays only) ---
    if (isMonday && user.reminderWeeklyEnabled) {
      const userHour = user.reminderWeeklyTime.slice(0, 2);
      if (userHour === currentHourStr) {
        const householdId = await getUserHouseholdId(user.id);
        const scopeCondition = householdId
          ? and(eq(tasks.householdId, householdId), eq(tasks.completed, false))
          : and(eq(tasks.userId, user.id), eq(tasks.completed, false));

        const allTasks = await db
          .select({ title: tasks.title, dueDate: tasks.dueDate })
          .from(tasks)
          .where(scopeCondition);

        const weekTasks = allTasks.filter((t) => {
          if (!t.dueDate) return false;
          const d = new Date(t.dueDate);
          return d >= todayStart && d < weekEnd;
        });

        if (weekTasks.length > 0) {
          const html = generateReminderHtml({
            userName: user.name,
            userEmail: user.email,
            taskTitles: weekTasks.map((t) => t.title),
            appUrl,
            type: "weekly",
          });

          // TODO: send email via Resend/SendGrid
          // await sendEmail({ to: user.email, subject: `You have ${weekTasks.length} task(s) due this week`, html });
          console.log(`[reminders/weekly] ${user.email}: ${weekTasks.length} tasks due this week`);
          void html;

          results.push({ email: user.email, type: "weekly", count: weekTasks.length });
        }
      }
    }
  }

  return NextResponse.json({ sent: results.length, results });
}
