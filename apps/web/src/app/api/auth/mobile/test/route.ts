export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createMobileToken, verifyMobileToken } from "@/lib/auth-mobile";

export async function GET() {
  const token = await createMobileToken({ id: "test123", email: "test@test.com", name: "Test" });
  const verified = await verifyMobileToken(token);
  return NextResponse.json({
    token: token.slice(0, 50) + "...",
    tokenLength: token.length,
    verified: !!verified,
    payload: verified,
  });
}
