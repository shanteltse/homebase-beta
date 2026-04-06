export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { db } from "@/db";
import { users, onboardingMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handleApiError, ApiError } from "@/lib/api-error";
import { validateOrigin } from "@/lib/api-utils";

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
    if (members.length > 0) {
      await db.insert(onboardingMembers).values(
        members
          .filter((m) => m.name?.trim())
          .map((m) => ({
            userId: user.id,
            name: m.name.trim().slice(0, 100),
            email: m.email?.trim() || null,
            relationship: m.relationship ?? "other",
          })),
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
