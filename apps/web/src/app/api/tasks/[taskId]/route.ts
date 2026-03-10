import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { updateTaskInputSchema } from "@/types/task";
import { rateLimitByIp } from "@/lib/api-rate-limit";
import { handleApiError, ApiError } from "@/lib/api-error";
import { validateOrigin } from "@/lib/api-utils";

type Params = { params: Promise<{ taskId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, session.user.id)))
    .limit(1);

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    if (!validateOrigin(request)) {
      throw new ApiError(403, "Forbidden");
    }

    const { allowed, retryAfterMs } = rateLimitByIp(request);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
          },
        },
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      throw new ApiError(401, "Unauthorized");
    }

    const { taskId } = await params;
    const body = await request.json();

    // Validate input — inject the taskId as `id` for the schema
    const validated = updateTaskInputSchema.parse({ ...body, id: taskId });

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (validated.title !== undefined) updates.title = validated.title;
    if (validated.category !== undefined) updates.category = validated.category;
    if (validated.subcategory !== undefined)
      updates.subcategory = validated.subcategory;
    if (validated.priority !== undefined) updates.priority = validated.priority;
    if (validated.notes !== undefined) updates.notes = validated.notes;
    if (validated.assignee !== undefined) updates.assignee = validated.assignee;
    if (validated.subtasks !== undefined) updates.subtasks = validated.subtasks;
    if (validated.tags !== undefined) updates.tags = validated.tags;
    if (validated.links !== undefined) updates.links = validated.links;
    if (validated.starred !== undefined) updates.starred = validated.starred;
    if (validated.recurring !== undefined)
      updates.recurring = validated.recurring;

    if (validated.dueDate !== undefined) {
      updates.dueDate = validated.dueDate ? new Date(validated.dueDate) : null;
    }

    if (validated.completed === true) {
      updates.completed = true;
      updates.completedAt = new Date();
      updates.status = "completed";
    } else if (validated.completed === false) {
      updates.completed = false;
      updates.completedAt = null;
      updates.status = "active";
    }

    const [task] = await db
      .update(tasks)
      .set(updates)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, session.user.id)))
      .returning();

    if (!task) {
      throw new ApiError(404, "Not found");
    }

    // Auto-generate next occurrence for recurring tasks
    if (validated.completed === true && task.recurring) {
      const recurring = task.recurring as {
        frequency: string;
        interval?: number;
        daysOfWeek?: number[];
      };

      const baseDate = task.dueDate ? new Date(task.dueDate) : new Date();
      const nextDueDate = calculateNextDueDate(baseDate, recurring);

      const [nextTask] = await db
        .insert(tasks)
        .values({
          userId: session.user.id,
          title: task.title,
          category: task.category,
          subcategory: task.subcategory,
          priority: task.priority,
          dueDate: nextDueDate,
          subtasks: (
            task.subtasks as { id: string; title: string; completed: boolean }[]
          ).map((s) => ({ ...s, completed: false })),
          tags: task.tags as string[],
          assignee: task.assignee,
          recurring: task.recurring,
          notes: task.notes,
          links: task.links as string[],
          starred: task.starred,
        })
        .returning();

      return NextResponse.json({ ...task, nextTask });
    }

    return NextResponse.json(task);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    if (!validateOrigin(request)) {
      throw new ApiError(403, "Forbidden");
    }

    const { allowed, retryAfterMs } = rateLimitByIp(request);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
          },
        },
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      throw new ApiError(401, "Unauthorized");
    }

    const { taskId } = await params;

    const [task] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, session.user.id)))
      .returning({ id: tasks.id });

    if (!task) {
      throw new ApiError(404, "Not found");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

function calculateNextDueDate(
  baseDate: Date,
  recurring: { frequency: string; interval?: number; daysOfWeek?: number[] },
): Date {
  const next = new Date(baseDate);

  switch (recurring.frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly": {
      if (recurring.daysOfWeek && recurring.daysOfWeek.length > 0) {
        const currentDay = next.getDay();
        const sorted = [...recurring.daysOfWeek].sort();
        const nextDay = sorted.find((d) => d > currentDay);
        if (nextDay !== undefined) {
          next.setDate(next.getDate() + (nextDay - currentDay));
        } else {
          next.setDate(next.getDate() + (7 - currentDay + sorted[0]!));
        }
      } else {
        next.setDate(next.getDate() + 7);
      }
      break;
    }
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "custom":
      next.setDate(next.getDate() + (recurring.interval ?? 1));
      break;
    default:
      next.setDate(next.getDate() + 1);
  }

  return next;
}
