export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { getUserHouseholdId } from "@/lib/get-user-household";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createTaskInputSchema } from "@/types/task";
import { rateLimitByIp } from "@/lib/api-rate-limit";
import { handleApiError, ApiError } from "@/lib/api-error";
import { validateOrigin } from "@/lib/api-utils";

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const householdId = await getUserHouseholdId(user.id);

  const result = await db
    .select()
    .from(tasks)
    .where(
      householdId
        ? eq(tasks.householdId, householdId)
        : eq(tasks.userId, user.id),
    )
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

    const user = await getAuthUser(request);
    if (!user) {
      throw new ApiError(401, "Unauthorized");
    }

    const body = await request.json();
    console.log("[POST /api/tasks] STEP A — raw body:", JSON.stringify(body));
    console.log("[POST /api/tasks] STEP A — dueDate in body:", body.dueDate ?? "(not present)");

    const validated = createTaskInputSchema.parse(body);
    console.log("[POST /api/tasks] STEP B — after Zod parse:", JSON.stringify(validated));
    console.log("[POST /api/tasks] STEP B — dueDate after Zod:", validated.dueDate ?? "(not present)");

    const householdId = await getUserHouseholdId(user.id);

    const insertValues = {
      userId: user.id,
      householdId,
      title: validated.title,
      category: validated.category,
      subcategory: validated.subcategory,
      priority: validated.priority,
      dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
      subtasks: validated.subtasks,
      tags: validated.tags,
      assignee: validated.assignee,
      notes: validated.notes,
      contact: validated.contact ?? null,
      links: validated.links,
      recurring: validated.recurring ?? null,
    };
    console.log("[POST /api/tasks] STEP C — DB insert dueDate value:", insertValues.dueDate);

    const [task] = await db
      .insert(tasks)
      .values(insertValues)
      .returning();

    console.log("[POST /api/tasks] STEP D — inserted task dueDate:", (task as { dueDate?: unknown } | undefined)?.dueDate ?? "(null)");

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
