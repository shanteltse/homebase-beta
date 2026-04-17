export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { db } from "@/db";
import { users, householdMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find the user's household
  const [membership] = await db
    .select()
    .from(householdMembers)
    .where(eq(householdMembers.userId, user.id))
    .limit(1);

  if (!membership) {
    return NextResponse.json([]);
  }

  // Get all members of that household with user info
  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: householdMembers.role,
      joinedAt: householdMembers.joinedAt,
      avatarColor: users.avatarColor,
      useGooglePhoto: users.useGooglePhoto,
    })
    .from(householdMembers)
    .innerJoin(users, eq(householdMembers.userId, users.id))
    .where(eq(householdMembers.householdId, membership.householdId));

  return NextResponse.json(members);
}
