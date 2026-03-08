export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const [task] = await db
      .insert(tasks)
      .values({
        userId: session.user.id,
        title: body.title,
        category: body.category,
        subcategory: body.subcategory,
        priority: body.priority ?? "medium",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        subtasks: body.subtasks ?? [],
        tags: body.tags ?? [],
        assignee: body.assignee,
        notes: body.notes,
        links: body.links ?? [],
      })
      .returning();

    return NextResponse.json(task, { status: 201 });
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;
    console.error("Failed to create task:", error);
    return NextResponse.json(
      {
        error: err?.message ?? "Failed to create task",
        code: err?.code,
        detail: err?.detail,
        hint: err?.hint,
        sourceError: err?.sourceError
          ? { message: (err.sourceError as Record<string, unknown>)?.message, code: (err.sourceError as Record<string, unknown>)?.code, detail: (err.sourceError as Record<string, unknown>)?.detail }
          : undefined,
      },
      { status: 500 },
    );
  }
}
