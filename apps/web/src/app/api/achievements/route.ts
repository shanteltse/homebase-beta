import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { db } from "@/db";
import { achievements } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userAchievements = await db
    .select()
    .from(achievements)
    .where(eq(achievements.userId, user.id));

  return NextResponse.json(userAchievements);
}
