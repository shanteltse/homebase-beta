export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { db } from "@/db";
import {
  households,
  householdMembers,
  householdInvitations,
} from "@/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { handleApiError, ApiError } from "@/lib/api-error";

interface RouteContext {
  params: Promise<{ token: string }>;
}

// GET /api/households/invite/[token]
// Returns invite details (household name, inviter name) for display on the invite page.
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;

    const [invite] = await db
      .select({
        id: householdInvitations.id,
        email: householdInvitations.email,
        expiresAt: householdInvitations.expiresAt,
        acceptedAt: householdInvitations.acceptedAt,
        householdName: households.name,
      })
      .from(householdInvitations)
      .innerJoin(households, eq(householdInvitations.householdId, households.id))
      .where(
        and(
          eq(householdInvitations.token, token),
          gt(householdInvitations.expiresAt, new Date()),
          isNull(householdInvitations.acceptedAt),
        ),
      )
      .limit(1);

    if (!invite) {
      return NextResponse.json(
        { error: "This invitation is invalid or has expired." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      email: invite.email,
      householdName: invite.householdName,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/households/invite/[token]
// Accepts the invitation for the currently logged-in user.
export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;

    const user = await getAuthUser(request);
    if (!user) {
      throw new ApiError(401, "Unauthorized");
    }

    const [invite] = await db
      .select()
      .from(householdInvitations)
      .where(
        and(
          eq(householdInvitations.token, token),
          gt(householdInvitations.expiresAt, new Date()),
          isNull(householdInvitations.acceptedAt),
        ),
      )
      .limit(1);

    if (!invite) {
      throw new ApiError(404, "This invitation is invalid or has expired.");
    }

    // Check user isn't already in a household
    const [existing] = await db
      .select()
      .from(householdMembers)
      .where(eq(householdMembers.userId, user.id))
      .limit(1);

    if (existing) {
      throw new ApiError(400, "You already belong to a household.");
    }

    await db.insert(householdMembers).values({
      householdId: invite.householdId,
      userId: user.id,
      role: "member",
    });

    await db
      .update(householdInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(householdInvitations.id, invite.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
