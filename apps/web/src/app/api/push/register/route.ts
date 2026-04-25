export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { deviceTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/get-auth-user";
import { handleApiError, ApiError } from "@/lib/api-error";
import { validateOrigin } from "@/lib/api-utils";

export async function POST(request: Request) {
  try {
    if (!validateOrigin(request)) throw new ApiError(403, "Forbidden");

    const user = await getAuthUser(request);
    if (!user) throw new ApiError(401, "Unauthorized");

    const body = await request.json() as { token?: string; platform?: string };
    const token = body.token?.trim();
    const platform = (body.platform ?? "ios") as "ios" | "android";

    if (!token) throw new ApiError(400, "token is required");

    // Upsert: delete any existing row for this user+token pair, then insert
    await db
      .delete(deviceTokens)
      .where(and(eq(deviceTokens.userId, user.id), eq(deviceTokens.token, token)));

    await db.insert(deviceTokens).values({ userId: user.id, token, platform });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
