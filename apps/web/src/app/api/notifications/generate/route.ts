import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { db } from "@/db";
import { notifications, tasks } from "@/db/schema";
import { and, eq, gte } from "drizzle-orm";
import { getUserHouseholdId } from "@/lib/get-user-household";

export async function POST() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const threeDaysOut = new Date(todayStart);
  threeDaysOut.setDate(threeDaysOut.getDate() + 3);

  // Fetch active tasks — household-scoped if the user is in a household
  const householdId = await getUserHouseholdId(userId);
  const taskScopeCondition = householdId
    ? and(eq(tasks.householdId, householdId), eq(tasks.completed, false))
    : and(eq(tasks.userId, userId), eq(tasks.completed, false));

  const userTasks = await db.select().from(tasks).where(taskScopeCondition);

  // Get today's existing notifications to de-duplicate
  const existingToday = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        gte(notifications.createdAt, todayStart),
      ),
    );

  const existingKeys = new Set(
    existingToday.map((n) => `${n.taskId}:${n.type}`),
  );

  const toCreate: {
    userId: string;
    type: "overdue" | "due_today" | "due_soon";
    title: string;
    message: string;
    taskId: string;
  }[] = [];

  for (const task of userTasks) {
    if (!task.dueDate) continue;

    const dueDate = new Date(task.dueDate);

    // Overdue: due date is before today start
    if (dueDate < todayStart) {
      if (!existingKeys.has(`${task.id}:overdue`)) {
        toCreate.push({
          userId,
          type: "overdue",
          title: "Task overdue",
          message: `"${task.title}" was due ${formatDaysAgo(todayStart, dueDate)}`,
          taskId: task.id,
        });
      }
    }
    // Due today
    else if (dueDate >= todayStart && dueDate < todayEnd) {
      if (!existingKeys.has(`${task.id}:due_today`)) {
        toCreate.push({
          userId,
          type: "due_today",
          title: "Task due today",
          message: `"${task.title}" is due today`,
          taskId: task.id,
        });
      }
    }
    // Due soon (within 3 days)
    else if (dueDate >= todayEnd && dueDate < threeDaysOut) {
      if (!existingKeys.has(`${task.id}:due_soon`)) {
        const daysUntil = Math.ceil(
          (dueDate.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24),
        );
        toCreate.push({
          userId,
          type: "due_soon",
          title: "Task due soon",
          message: `"${task.title}" is due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
          taskId: task.id,
        });
      }
    }
  }

  if (toCreate.length > 0) {
    await db.insert(notifications).values(toCreate);
  }

  return NextResponse.json({ created: toCreate.length });
}

function formatDaysAgo(today: Date, date: Date): string {
  const diffMs = today.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
