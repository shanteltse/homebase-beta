export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createMobileToken, verifyMobileToken } from "@/lib/auth-mobile";

export async function GET() {
  try {
    const secretPresent = !!process.env.AUTH_SECRET;
    const secretLength = process.env.AUTH_SECRET?.length ?? 0;

    const token = await createMobileToken({ id: "test123", email: "test@test.com", name: "Test" });
    const verified = await verifyMobileToken(token);

    return NextResponse.json({
      ok: true,
      secretPresent,
      secretLength,
      token: token.slice(0, 50) + "...",
      tokenLength: token.length,
      verified: !!verified,
      payload: verified,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: String(err),
      secretPresent: !!process.env.AUTH_SECRET,
    });
  }
}
