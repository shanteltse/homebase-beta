export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { households, householdMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handleApiError, ApiError } from "@/lib/api-error";
import { validateOrigin } from "@/lib/api-utils";

const createHouseholdSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await db
    .select({
      id: households.id,
      name: households.name,
      code: households.code,
      createdBy: households.createdBy,
      createdAt: households.createdAt,
      role: householdMembers.role,
    })
    .from(householdMembers)
    .innerJoin(households, eq(householdMembers.householdId, households.id))
    .where(eq(householdMembers.userId, session.user.id))
    .limit(1);

  if (membership.length === 0) {
    return NextResponse.json(null);
  }

  return NextResponse.json(membership[0]);
}

export async function POST(request: Request) {
  try {
    if (!validateOrigin(request)) {
      throw new ApiError(403, "Forbidden");
    }

    const session = await auth();
    if (!session?.user?.id) {
      throw new ApiError(401, "Unauthorized");
    }

    const body = await request.json();
    const validated = createHouseholdSchema.parse(body);
    const name = validated.name.trim();

    // Check if user already belongs to a household
    const existing = await db
      .select()
      .from(householdMembers)
      .where(eq(householdMembers.userId, session.user.id))
      .limit(1);

    if (existing.length > 0) {
      throw new ApiError(400, "You already belong to a household");
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const [household] = await db
      .insert(households)
      .values({
        name,
        code,
        createdBy: session.user.id,
      })
      .returning();

    if (!household) {
      throw new ApiError(500, "Failed to create household");
    }

    await db.insert(householdMembers).values({
      householdId: household.id,
      userId: session.user.id,
      role: "owner",
    });

    return NextResponse.json(household, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
