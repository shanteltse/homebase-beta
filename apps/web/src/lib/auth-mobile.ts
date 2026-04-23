import { SignJWT, jwtVerify } from "jose";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET);

export interface MobileTokenPayload {
  sub: string; // user id
  email: string;
  name: string | null;
}

export async function createMobileToken(user: {
  id: string;
  email: string;
  name: string | null;
}): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifyMobileToken(
  token: string,
): Promise<MobileTokenPayload | null> {
  try {
    console.log("[verifyMobileToken] token length:", token.length, "last 10 chars:", token.slice(-10));
    const { payload } = await jwtVerify(token, SECRET);
    console.log("[verifyMobileToken] payload:", JSON.stringify(payload));
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: payload.email as string,
      name: payload.name as string | null,
    };
  } catch (err) {
    console.log("[verifyMobileToken] error:", err);
    return null;
  }
}

/**
 * Extract user ID from a Bearer token in the Authorization header.
 * Returns null if no valid Bearer token is present.
 */
export async function getUserFromBearerToken(
  request: Request,
): Promise<{ id: string; email: string; name: string | null } | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const payload = await verifyMobileToken(token);
  if (!payload) return null;

  // Verify user still exists
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  return user ?? null;
}
