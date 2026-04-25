export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, tasks, deviceTokens } from "@/db/schema";
import { eq, and, gte, lt, isNotNull } from "drizzle-orm";

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
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const dayAfterTomorrow = new Date(tomorrowStart);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  // Find all users who have at least one device token
  const usersWithTokens = await db
    .selectDistinct({ id: deviceTokens.userId })
    .from(deviceTokens);

  const results: { userId: string; sent: number }[] = [];
  const errors: { userId: string; error: string }[] = [];

  for (const { id: userId } of usersWithTokens) {
    try {
      // Find tasks due within the next 24 hours that are not completed
      const dueSoon = await db
        .select({ id: tasks.id, title: tasks.title, dueDate: tasks.dueDate })
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, userId),
            eq(tasks.completed, false),
            isNotNull(tasks.dueDate),
            gte(tasks.dueDate, tomorrowStart.toISOString().split("T")[0]!),
            lt(tasks.dueDate, dayAfterTomorrow.toISOString().split("T")[0]!),
          ),
        );

      const overdueToday = await db
        .select({ id: tasks.id, title: tasks.title, dueDate: tasks.dueDate })
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, userId),
            eq(tasks.completed, false),
            isNotNull(tasks.dueDate),
            gte(tasks.dueDate, todayStart.toISOString().split("T")[0]!),
            lt(tasks.dueDate, tomorrowStart.toISOString().split("T")[0]!),
          ),
        );

      const allDue = [...overdueToday, ...dueSoon];
      if (allDue.length === 0) continue;

      let message: string;
      if (allDue.length === 1) {
        message = `"${allDue[0]!.title}" is due soon.`;
      } else {
        message = `${allDue.length} tasks are due soon, including "${allDue[0]!.title}".`;
      }

      const res = await fetch(`${appUrl}/api/push/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cronSecret}`,
        },
        body: JSON.stringify({
          userId,
          title: "Tasks due soon",
          message,
        }),
      });

      const data = await res.json() as { sent?: number };
      results.push({ userId, sent: data.sent ?? 0 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[push/reminders] error for user", userId, msg);
      errors.push({ userId, error: msg });
    }
  }

  return NextResponse.json({ notified: results.length, results, errors });
}
