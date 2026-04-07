export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getAuthUser } from "@/lib/get-auth-user";
import { db } from "@/db";
import { households, householdMembers, householdInvitations, onboardingMembers, tasks } from "@/db/schema";
import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { sendEmail } from "@/lib/send-email";
import { generateInviteHtml } from "@/lib/email-templates";
import { handleApiError, ApiError } from "@/lib/api-error";
import { validateOrigin } from "@/lib/api-utils";

const createHouseholdSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
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
    .where(eq(householdMembers.userId, user.id))
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

    const user = await getAuthUser(request);
    if (!user) {
      throw new ApiError(401, "Unauthorized");
    }

    const body = await request.json();
    const validated = createHouseholdSchema.parse(body);
    const name = validated.name.trim();

    // Check if user already belongs to a household
    const existing = await db
      .select()
      .from(householdMembers)
      .where(eq(householdMembers.userId, user.id))
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
        createdBy: user.id,
      })
      .returning();

    if (!household) {
      throw new ApiError(500, "Failed to create household");
    }

    await db.insert(householdMembers).values({
      householdId: household.id,
      userId: user.id,
      role: "owner",
    });

    // Migrate the creator's existing solo tasks into the new household.
    await db
      .update(tasks)
      .set({ householdId: household.id })
      .where(and(eq(tasks.userId, user.id), isNull(tasks.householdId)));

    // Send email invites to any onboarding members that have emails
    const pendingMembers = await db
      .select()
      .from(onboardingMembers)
      .where(and(eq(onboardingMembers.userId, user.id), isNotNull(onboardingMembers.email)));

    if (pendingMembers.length > 0) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://homebase-beta-web.vercel.app";
      for (const m of pendingMembers) {
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const email = m.email!.toLowerCase();

        await db.insert(householdInvitations).values({
          householdId: household.id,
          inviterUserId: user.id,
          email,
          token,
          expiresAt,
        });

        await sendEmail({
          to: email,
          subject: `${user.name ?? "Someone"} invited you to join ${household.name} on HomeBase`,
          html: generateInviteHtml({
            inviterName: user.name ?? null,
            householdName: household.name,
            inviteUrl: `${appUrl}/invite/${token}`,
            appUrl,
          }),
        }).catch((err: unknown) => {
          console.error("[households] Failed to send invite email to", email, err);
        });
      }
    }

    return NextResponse.json(household, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
