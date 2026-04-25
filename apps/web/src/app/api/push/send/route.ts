export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { deviceTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/get-auth-user";
import { handleApiError, ApiError } from "@/lib/api-error";
import { validateOrigin } from "@/lib/api-utils";

export async function POST(request: Request) {
  try {
    if (!validateOrigin(request)) throw new ApiError(403, "Forbidden");

    // Allow both authenticated users (sending to themselves) and cron (CRON_SECRET)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCron) {
      const user = await getAuthUser(request);
      if (!user) throw new ApiError(401, "Unauthorized");
    }

    const body = await request.json() as { userId: string; title?: string; message: string };
    const { userId, title = "HomeBase", message } = body;

    if (!userId || !message) throw new ApiError(400, "userId and message are required");

    const tokens = await db
      .select({ token: deviceTokens.token, platform: deviceTokens.platform })
      .from(deviceTokens)
      .where(eq(deviceTokens.userId, userId));

    if (tokens.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    const iosTokens = tokens.filter((t) => t.platform === "ios").map((t) => t.token);

    let sent = 0;
    if (iosTokens.length > 0) {
      sent = await sendApns({ tokens: iosTokens, title, message });
    }

    return NextResponse.json({ ok: true, sent });
  } catch (error) {
    return handleApiError(error);
  }
}

async function sendApns({
  tokens,
  title,
  message,
}: {
  tokens: string[];
  title: string;
  message: string;
}): Promise<number> {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const privateKey = process.env.APNS_PRIVATE_KEY;
  const bundleId = process.env.APNS_BUNDLE_ID ?? "com.homebase.app";
  const production = process.env.NODE_ENV === "production";

  if (!keyId || !teamId || !privateKey) {
    console.error("[push/send] APNs env vars not configured");
    return 0;
  }

  // apn is a CommonJS module — dynamic import to avoid Next.js edge issues
  const apn = await import("apn");

  const provider = new apn.default.Provider({
    token: {
      key: privateKey.replace(/\\n/g, "\n"),
      keyId,
      teamId,
    },
    production,
  });

  const notification = new apn.default.Notification();
  notification.expiry = Math.floor(Date.now() / 1000) + 3600;
  notification.badge = 1;
  notification.sound = "default";
  notification.alert = { title, body: message };
  notification.topic = bundleId;

  let sent = 0;
  for (const token of tokens) {
    try {
      const result = await provider.send(notification, token);
      if (result.sent.length > 0) sent++;
      if (result.failed.length > 0) {
        console.error("[push/send] APNs failure for token", token, result.failed[0]?.error);
      }
    } catch (err) {
      console.error("[push/send] APNs error for token", token, err);
    }
  }

  provider.shutdown();
  return sent;
}
