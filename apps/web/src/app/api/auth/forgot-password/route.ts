export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { generatePasswordResetHtml } from "@/lib/email-templates";
import { sendEmail } from "@/lib/send-email";
import { rateLimitByIp } from "@/lib/api-rate-limit";
import { validateOrigin } from "@/lib/api-utils";
import { ApiError, handleApiError } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    if (!validateOrigin(request)) throw new ApiError(403, "Forbidden");

    const { allowed } = rateLimitByIp(request);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json() as { email?: string };
    const email = (body.email ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    // Always return 200 to avoid user enumeration
    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return NextResponse.json({ ok: true });
    }

    // Delete any existing reset token for this email
    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, `reset:${email}`),
        ),
      );

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(verificationTokens).values({
      identifier: `reset:${email}`,
      token,
      expires,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://homebase-beta-web.vercel.app";
    const resetUrl = `${appUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    // Generate email HTML
    const html = generatePasswordResetHtml({ userName: user.name, resetUrl, appUrl });

    await sendEmail({ to: email, subject: "Reset your HomeBase password", html });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
