"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "../api/get-user";
import type { ReactNode } from "react";

// Pages that should be accessible even when logged in (e.g. linked from within the app)
const ALLOW_AUTHENTICATED = ["/forgot-password", "/reset-password"];

export function GuestGuard({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && user && !ALLOW_AUTHENTICATED.includes(pathname)) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading || (user && !ALLOW_AUTHENTICATED.includes(pathname))) return null;

  return <>{children}</>;
}
