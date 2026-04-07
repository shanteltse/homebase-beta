export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getAuthUser } from "@/lib/get-auth-user";
import { db } from "@/db";
import { households, householdMembers, householdInvitations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handleApiError, ApiError } from "@/lib/api-error";
import { validateOrigin } from "@/lib/api-utils";
import { sendEmail } from "@/lib/send-email";
import { generateInviteHtml } from "@/lib/email-templates";

const inviteSchema = z.object({
  email: z.email("Enter a valid email address"),
});

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
    const { email } = inviteSchema.parse(body);

    // Get the user's household
    const [membership] = await db
      .select({
        householdId: householdMembers.householdId,
        householdName: households.name,
      })
      .from(householdMembers)
      .innerJoin(households, eq(householdMembers.householdId, households.id))
      .where(eq(householdMembers.userId, user.id))
      .limit(1);

    if (!membership) {
      throw new ApiError(400, "You must be in a household to send invitations");
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(householdInvitations).values({
      householdId: membership.householdId,
      inviterUserId: user.id,
      email: email.toLowerCase(),
      token,
      expiresAt,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://homebase-beta-web.vercel.app";
    const inviteUrl = `${appUrl}/invite/${token}`;

    await sendEmail({
      to: email,
      subject: `${user.name ?? "Someone"} invited you to join ${membership.householdName} on HomeBase`,
      html: generateInviteHtml({
        inviterName: user.name ?? null,
        householdName: membership.householdName,
        inviteUrl,
        appUrl,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
