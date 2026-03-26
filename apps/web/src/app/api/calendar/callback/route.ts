export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const settingsUrl = `${origin}/settings?gcal=`;

  if (error || !code || !state) {
    return NextResponse.redirect(`${settingsUrl}error`);
  }

  // Decode state to get userId and return destination
  let userId: string;
  let from = "settings";
  try {
    const decoded = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8"),
    );
    userId = decoded.userId;
    if (decoded.from) from = decoded.from;
    if (!userId) throw new Error("Missing userId");
  } catch {
    return NextResponse.redirect(`${settingsUrl}error`);
  }

  // Build the success/error redirect base based on `from`
  const returnBase =
    from === "calendar"
      ? `${origin}/calendar?gcal=`
      : `${origin}/settings?gcal=`;

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${settingsUrl}error`);
  }

  const redirectUri = `${origin}/api/calendar/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${returnBase}error`);
  }

  const tokenData = await tokenRes.json();
  const { access_token, refresh_token } = tokenData;

  if (!access_token) {
    return NextResponse.redirect(`${returnBase}error`);
  }

  // Store tokens and mark as connected
  await db
    .update(users)
    .set({
      gcalConnected: true,
      gcalSyncEnabled: true,
      gcalAccessToken: access_token,
      gcalRefreshToken: refresh_token ?? null,
    })
    .where(eq(users.id, userId));

  return NextResponse.redirect(`${returnBase}connected`);
}
