export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { db } from "@/db";
import { users, onboardingMembers, households, householdMembers, householdInvitations, tasks } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { handleApiError, ApiError } from "@/lib/api-error";
import { validateOrigin } from "@/lib/api-utils";
import { sendEmail } from "@/lib/send-email";
import { generateInviteHtml } from "@/lib/email-templates";

type OnboardingMember = {
  name: string;
  email?: string;
  relationship: "partner" | "child" | "roommate" | "other";
};


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
    const {
      name,
      members = [],
      notificationDailyRecap = true,
      notificationRecapTime = "08:00",
      notificationMorningSummary = true,
      notificationTaskReminders = true,
    } = body as {
      name?: string;
      members?: OnboardingMember[];
      notificationDailyRecap?: boolean;
      notificationRecapTime?: string;
      notificationMorningSummary?: boolean;
      notificationTaskReminders?: boolean;
    };

    // Update user profile and mark onboarding complete
    await db
      .update(users)
      .set({
        name: name?.trim().slice(0, 100) ?? undefined,
        onboardingCompleted: true,
        onboardingStep: 4,
        notificationDailyRecap,
        notificationRecapTime,
        notificationMorningSummary,
        notificationTaskReminders,
      })
      .where(eq(users.id, user.id));

    // Insert household members
    const validMembers = members.filter((m) => m.name?.trim());
    if (validMembers.length > 0) {
      await db.insert(onboardingMembers).values(
        validMembers.map((m) => ({
          userId: user.id,
          name: m.name.trim().slice(0, 100),
          email: m.email?.trim() || null,
          relationship: m.relationship ?? "other",
        })),
      );
    }

    // Send email invites to members with emails
    const membersWithEmail = validMembers.filter((m) => m.email?.trim());
    if (membersWithEmail.length > 0) {
      const [membership] = await db
        .select({ householdId: householdMembers.householdId, householdName: households.name })
        .from(householdMembers)
        .innerJoin(households, eq(householdMembers.householdId, households.id))
        .where(eq(householdMembers.userId, user.id))
        .limit(1);

      // Determine which household to invite into — existing one, or auto-create
      let inviteHouseholdId: string;
      let inviteHouseholdName: string;

      if (membership) {
        inviteHouseholdId = membership.householdId;
        inviteHouseholdName = membership.householdName;
      } else {
        // Auto-create a household so invites can be sent immediately
        const householdName = `${(name?.trim() ?? user.name ?? "My")}'s Home`;
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const [newHousehold] = await db
          .insert(households)
          .values({ name: householdName, code, createdBy: user.id })
          .returning();

        if (!newHousehold) {
          return NextResponse.json({ success: true });
        }

        await db.insert(householdMembers).values({
          householdId: newHousehold.id,
          userId: user.id,
          role: "owner",
        });

        // Migrate existing solo tasks into the new household
        await db
          .update(tasks)
          .set({ householdId: newHousehold.id })
          .where(and(eq(tasks.userId, user.id), isNull(tasks.householdId)));

        inviteHouseholdId = newHousehold.id;
        inviteHouseholdName = newHousehold.name;
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://homebase-beta-web.vercel.app";
      for (const m of membersWithEmail) {
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const email = m.email!.trim().toLowerCase();

        await db.insert(householdInvitations).values({
          householdId: inviteHouseholdId,
          inviterUserId: user.id,
          email,
          token,
          expiresAt,
        });

        await sendEmail({
          to: email,
          subject: `${user.name ?? "Someone"} invited you to join ${inviteHouseholdName} on HomeBase`,
          html: generateInviteHtml({
            inviterName: user.name ?? null,
            householdName: inviteHouseholdName,
            inviteUrl: `${appUrl}/invite/${token}`,
            appUrl,
          }),
        }).catch((err: unknown) => {
          console.error("[onboarding/complete] Failed to send invite email to", email, err);
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
