export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createTaskInputSchema } from "@/types/task";
import { rateLimitByIp } from "@/lib/api-rate-limit";
import { handleApiError, ApiError } from "@/lib/api-error";
import { validateOrigin } from "@/lib/api-utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, session.user.id))
    .orderBy(desc(tasks.createdAt));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const validated = createTaskInputSchema.parse(body);

    const [task] = await db
      .insert(tasks)
      .values({
        userId: session.user.id,
        title: validated.title,
        category: validated.category,
        subcategory: validated.subcategory,
        priority: validated.priority,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
        subtasks: validated.subtasks,
        tags: validated.tags,
        assignee: validated.assignee,
        notes: validated.notes,
        links: validated.links,
        recurring: validated.recurring ?? null,
      })
      .returning();

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
