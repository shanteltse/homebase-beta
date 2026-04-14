export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 });
  }

  const appUrl = process.env.NEXTAUTH_URL ?? new URL(request.url).origin;
  const redirectUri = `${appUrl}/api/calendar/callback`;

  // Optional `from` param so the callback knows where to redirect after success
  const from = new URL(request.url).searchParams.get("from") ?? "settings";

  // State encodes the user ID and return destination
  const state = Buffer.from(JSON.stringify({ userId: user.id, from })).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  // Pre-select the account the user is already signed in with so they
  // can't accidentally connect a different Google account.
  if (user.email) {
    params.set("login_hint", user.email);
  }

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
  );
}
