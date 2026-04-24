export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createMobileToken } from "@/lib/auth-mobile";
import { rateLimitByIp } from "@/lib/api-rate-limit";
import { handleApiError, ApiError } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    const { allowed, retryAfterMs } = rateLimitByIp(request);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
      );
    }

    const body = await request.json();
    const { email: rawEmail, password } = body;

    console.log("[mobile/token] raw email:", JSON.stringify(rawEmail), "| password present:", !!password);

    if (!rawEmail || !password) {
      console.log("[mobile/token] 400 — missing email or password");
      throw new ApiError(400, "Email and password are required");
    }

    const email = (rawEmail as string).toLowerCase().trim();
    console.log("[mobile/token] normalized email:", JSON.stringify(email));

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    console.log("[mobile/token] DB result — user found:", !!user, "| has passwordHash:", !!user?.passwordHash);

    if (!user?.passwordHash) {
      console.log("[mobile/token] 401 — no user found or no passwordHash for email:", email);
      throw new ApiError(401, "Invalid email or password");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    console.log("[mobile/token] bcrypt.compare result:", valid);

    if (!valid) {
      console.log("[mobile/token] 401 — bcrypt compare failed for user id:", user.id);
      throw new ApiError(401, "Invalid email or password");
    }

    const token = await createMobileToken({
      id: user.id,
      email: user.email!,
      name: user.name,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
