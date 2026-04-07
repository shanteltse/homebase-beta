export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { households, householdInvitations, householdMembers } from "@/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { InviteLanding } from "./invite-landing";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;

  const [invite] = await db
    .select({
      id: householdInvitations.id,
      householdId: householdInvitations.householdId,
      email: householdInvitations.email,
      expiresAt: householdInvitations.expiresAt,
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
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="heading-lg text-foreground mb-2">HomeBase</h1>
          <p className="body text-muted-foreground mt-6">
            This invitation is invalid or has already expired.
          </p>
        </div>
      </div>
    );
  }

  const session = await auth();

  if (session?.user?.id) {
    // User is already logged in — auto-accept if not already in a household
    const [existing] = await db
      .select()
      .from(householdMembers)
      .where(eq(householdMembers.userId, session.user.id))
      .limit(1);

    if (!existing) {
      await db.insert(householdMembers).values({
        householdId: invite.householdId,
        userId: session.user.id,
        role: "member",
      });

      await db
        .update(householdInvitations)
        .set({ acceptedAt: new Date() })
        .where(eq(householdInvitations.id, invite.id));
    }

    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="heading-lg text-foreground">HomeBase</h1>
        </div>
        <InviteLanding householdName={invite.householdName} token={token} />
      </div>
    </div>
  );
}
