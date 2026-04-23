export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createMobileToken } from "@/lib/auth-mobile";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const REDIRECT_URI = "https://homebase-beta-web.vercel.app/api/auth/mobile/google/callback";
const APP_DEEP_LINK = "com.homebase.app://auth/callback";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${APP_DEEP_LINK}?error=${encodeURIComponent(error ?? "access_denied")}`,
    );
  }

  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenRes.status}`);
    }

    const { id_token } = (await tokenRes.json()) as { id_token: string };

    // Decode JWT payload — no sig verification needed; token came directly from Google over HTTPS
    const payload = JSON.parse(
      Buffer.from(id_token.split(".")[1]!, "base64url").toString("utf-8"),
    ) as { email: string; name?: string; picture?: string };

    const { email, name, picture } = payload;
    if (!email) throw new Error("No email in Google ID token");

    let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      [user] = await db
        .insert(users)
        .values({ email, name: name ?? email, image: picture ?? null })
        .returning();
    }

    if (!user) throw new Error("Failed to upsert user");

    const token = await createMobileToken({ id: user.id, email: user.email!, name: user.name });
    console.log("[callback] token created, length:", token.length, "last20:", token.slice(-20));

    // JWT tokens are base64url-encoded (URL-safe chars only) — no encodeURIComponent needed.
    // Applying it causes double-encoding when Next.js re-encodes the Location header.
    return NextResponse.redirect(`${APP_DEEP_LINK}?token=${token}`);
  } catch {
    return NextResponse.redirect(`${APP_DEEP_LINK}?error=server_error`);
  }
}
