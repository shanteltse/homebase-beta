export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { households, householdMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handleApiError, ApiError } from "@/lib/api-error";
import { validateOrigin } from "@/lib/api-utils";

const joinHouseholdSchema = z.object({
  code: z
    .string()
    .length(6, "Invite code must be exactly 6 characters")
    .regex(/^[A-Za-z0-9]+$/, "Invite code must be alphanumeric"),
});

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
    const validated = joinHouseholdSchema.parse(body);
    const code = validated.code.trim().toUpperCase();

    // Check if user already belongs to a household
    const existing = await db
      .select()
      .from(householdMembers)
      .where(eq(householdMembers.userId, session.user.id))
      .limit(1);

    if (existing.length > 0) {
      throw new ApiError(400, "You already belong to a household");
    }

    // Find household by code
    const [household] = await db
      .select()
      .from(households)
      .where(eq(households.code, code))
      .limit(1);

    if (!household) {
      throw new ApiError(404, "Invalid invite code");
    }

    await db.insert(householdMembers).values({
      householdId: household.id,
      userId: session.user.id,
      role: "member",
    });

    return NextResponse.json(household, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
