"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState, type ReactNode } from "react";
import { createQueryClient } from "@/lib/react-query";
import { MobileAuthProvider } from "@/lib/mobile-auth-provider";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <MobileAuthProvider>{children}</MobileAuthProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
