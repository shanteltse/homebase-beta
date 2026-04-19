import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, tasks, achievements, householdMembers } from "@/db/schema";
import { eq, and, lt, gte, lte, desc } from "drizzle-orm";
import {
  generateDigestHtml,
  type DigestData,
  type DigestTask,
} from "@/lib/email-templates";
import { sendEmail } from "@/lib/send-email";

/**
 * POST /api/email/digest
 *
 * Generates and (eventually) sends daily digest emails to all users with tasks.
 * Designed to be called by Vercel Cron or an external scheduler (e.g., cron-job.org).
 *
 * Authorization: Bearer ${CRON_SECRET}
 *
 * To set up with Vercel Cron, add to vercel.json:
 *   { "crons": [{ "path": "/api/email/digest", "schedule": "0 8 * * *" }] }
 *
 * Or call externally:
 *   curl -X POST https://your-app.vercel.app/api/email/digest \
 *     -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost:3000";
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get all users who have at least one task
    const usersWithTasks = await db
      .selectDistinct({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .innerJoin(tasks, eq(users.id, tasks.userId));

    const emails: Array<{
      email: string;
      name: string | null;
      overdue: number;
      today: number;
      week: number;
      completed: number;
    }> = [];

    for (const user of usersWithTasks) {
      // Determine task scope: household tasks if the user is in a household
      const [membership] = await db
        .select({ householdId: householdMembers.householdId })
        .from(householdMembers)
        .where(eq(householdMembers.userId, user.id))
        .limit(1);
      const taskScope = membership
        ? eq(tasks.householdId, membership.householdId)
        : eq(tasks.userId, user.id);

      // Overdue tasks: not completed, due date before today
      const overdueTasks = await db
        .select()
        .from(tasks)
        .where(and(taskScope, eq(tasks.completed, false), lt(tasks.dueDate, todayStart)))
        .orderBy(desc(tasks.dueDate))
        .limit(10);

      // Tasks due today
      const dueTodayTasks = await db
        .select()
        .from(tasks)
        .where(
          and(taskScope, eq(tasks.completed, false), gte(tasks.dueDate, todayStart), lte(tasks.dueDate, todayEnd)),
        )
        .orderBy(tasks.priority);

      // Tasks due this week (excluding today)
      const nextDay = new Date(todayEnd.getTime() + 1);
      const dueThisWeekTasks = await db
        .select()
        .from(tasks)
        .where(
          and(taskScope, eq(tasks.completed, false), gte(tasks.dueDate, nextDay), lte(tasks.dueDate, weekEnd)),
        )
        .orderBy(tasks.dueDate)
        .limit(10);

      // Recently completed (last 24h)
      const recentlyCompletedTasks = await db
        .select()
        .from(tasks)
        .where(and(taskScope, eq(tasks.completed, true), gte(tasks.completedAt, yesterday)))
        .orderBy(desc(tasks.completedAt))
        .limit(10);

      // Current streak: count consecutive days with at least one completed task
      let currentStreak: number | null = null;
      try {
        const userAchievements = await db
          .select()
          .from(achievements)
          .where(
            and(
              eq(achievements.userId, user.id),
              eq(achievements.type, "streak"),
            ),
          )
          .limit(1);

        if (userAchievements.length > 0) {
          // Achievement exists — streak is active. Count based on recent completions.
          currentStreak = await calculateStreak(user.id);
        }
      } catch {
        // achievements table may not exist yet — skip streak
        currentStreak = null;
      }

      const toDigestTask = (t: typeof tasks.$inferSelect): DigestTask => ({
        id: t.id,
        title: t.title,
        category: t.category,
        priority: t.priority,
        dueDate: t.dueDate,
      });

      const digestData: DigestData = {
        userName: user.name ?? "there",
        userEmail: user.email,
        overdueTasks: overdueTasks.map(toDigestTask),
        dueTodayTasks: dueTodayTasks.map(toDigestTask),
        dueThisWeekTasks: dueThisWeekTasks.map(toDigestTask),
        recentlyCompleted: recentlyCompletedTasks.map(toDigestTask),
        currentStreak,
        appUrl,
      };

      const html = generateDigestHtml(digestData);

      try {
        await sendEmail({ to: user.email, subject: "Your HomeBase Daily Digest", html });
        console.log(
          `[email-digest] Sent digest to ${user.email} — ` +
            `overdue: ${overdueTasks.length}, today: ${dueTodayTasks.length}, ` +
            `week: ${dueThisWeekTasks.length}, completed: ${recentlyCompletedTasks.length}`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[email-digest] Failed to send to ${user.email}:`, msg);
      }

      emails.push({
        email: user.email,
        name: user.name,
        overdue: overdueTasks.length,
        today: dueTodayTasks.length,
        week: dueThisWeekTasks.length,
        completed: recentlyCompletedTasks.length,
      });
    }

    return NextResponse.json({
      success: true,
      processed: emails.length,
      emails,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("[email-digest] Error generating digests:", error);
    return NextResponse.json(
      { error: "Failed to generate digests" },
      { status: 500 },
    );
  }
}

/**
 * Calculate the current streak (consecutive days with at least one task completed).
 * Looks back up to 365 days.
 */
async function calculateStreak(userId: string): Promise<number> {
  const now = new Date();
  let streak = 0;

  for (let i = 0; i < 365; i++) {
    const dayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - i,
    );
    const dayEnd = new Date(
      dayStart.getFullYear(),
      dayStart.getMonth(),
      dayStart.getDate(),
      23,
      59,
      59,
      999,
    );

    const completedOnDay = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId), // streak is personal — count tasks the user completed
          eq(tasks.completed, true),
          gte(tasks.completedAt, dayStart),
          lte(tasks.completedAt, dayEnd),
        ),
      )
      .limit(1);

    if (completedOnDay.length > 0) {
      streak++;
    } else if (i === 0) {
      // Today doesn't count against the streak if nothing completed yet
      continue;
    } else {
      break;
    }
  }

  return streak;
}
