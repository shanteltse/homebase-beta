import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { achievements } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userAchievements = await db
    .select()
    .from(achievements)
    .where(eq(achievements.userId, session.user.id));

  return NextResponse.json(userAchievements);
}
