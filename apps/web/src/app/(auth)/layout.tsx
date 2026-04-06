import { GuestGuard } from "@/features/auth/components/guest-guard";
import Link from "next/link";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4">
        <div className="mb-8 text-center">
          <h1 className="heading-lg text-foreground">HomeBase</h1>
        </div>
        <GuestGuard>{children}</GuestGuard>
      </div>
      <p className="mt-8 text-xs text-muted-foreground">
        <Link href="/privacy" className="hover:text-foreground hover:underline transition-colors">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
