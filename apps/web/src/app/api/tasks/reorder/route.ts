import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getAuthUser } from "@/lib/get-auth-user";
import { getUserHouseholdId } from "@/lib/get-user-household";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { rateLimitByIp } from "@/lib/api-rate-limit";
import { handleApiError, ApiError } from "@/lib/api-error";
import { validateOrigin } from "@/lib/api-utils";

const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string() })).min(1),
});

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
          headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
        },
      );
    }

    const user = await getAuthUser(request);
    if (!user) throw new ApiError(401, "Unauthorized");

    const body = await request.json();
    const { items } = reorderSchema.parse(body);

    const householdId = await getUserHouseholdId(user.id);

    // Verify all tasks belong to this user/household before writing
    const ids = items.map((i) => i.id);
    const owned = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        householdId
          ? and(inArray(tasks.id, ids), eq(tasks.householdId, householdId))
          : and(inArray(tasks.id, ids), eq(tasks.userId, user.id)),
      );

    const ownedIds = new Set(owned.map((r) => r.id));
    const safeItems = items.filter((i) => ownedIds.has(i.id));

    await Promise.all(
      safeItems.map(({ id }) =>
        db
          .update(tasks)
          .set({ updatedAt: new Date() })
          .where(eq(tasks.id, id)),
      ),
    );

    return NextResponse.json({ success: true, updated: safeItems.length });
  } catch (error) {
    return handleApiError(error);
  }
}
