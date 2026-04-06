export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { getUserHouseholdId } from "@/lib/get-user-household";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { createTaskInputSchema } from "@/types/task";
import { rateLimitByIp } from "@/lib/api-rate-limit";
import { handleApiError, ApiError } from "@/lib/api-error";
import { validateOrigin } from "@/lib/api-utils";
import { z } from "zod/v4";

const batchSchema = z.object({
  tasks: z.array(createTaskInputSchema).min(1).max(50),
});

export async function POST(request: Request) {
  try {
    if (!validateOrigin(request)) throw new ApiError(403, "Forbidden");

    const { allowed, retryAfterMs } = rateLimitByIp(request);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
        },
      );
    }

    const user = await getAuthUser(request);
    if (!user) throw new ApiError(401, "Unauthorized");

    const body = await request.json();
    const { tasks: inputTasks } = batchSchema.parse(body);

    const householdId = await getUserHouseholdId(user.id);

    const inserted = await db
      .insert(tasks)
      .values(
        inputTasks.map((t) => ({
          userId: user.id,
          householdId,
          title: t.title,
          category: t.category,
          subcategory: t.subcategory,
          priority: t.priority,
          dueDate: t.dueDate ? new Date(t.dueDate) : null,
          subtasks: t.subtasks,
          tags: t.tags,
          assignee: t.assignee,
          notes: t.notes,
          contact: t.contact ?? null,
          links: t.links,
          recurring: t.recurring ?? null,
          isImported: true,
        })),
      )
      .returning();

    return NextResponse.json({ created: inserted }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
