"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { getMobileToken } from "@/lib/mobile-auth-storage";

function isNative(): boolean {
  return typeof window !== "undefined" &&
    !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.();
}

async function fetchMobileUser() {
  const token = await getMobileToken();
  if (!token) return null;
  const res = await fetch("/api/user/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const profile = await res.json() as { id: string; name: string | null; email: string; image: string | null };
  return { id: profile.id, name: profile.name, email: profile.email, image: profile.image };
}

export function useUser() {
  // Defer native detection to after mount — window.Capacitor is not available
  // during SSR/hydration, causing isNative() to return false synchronously.
  // Without this, the mobile query starts disabled, useUser returns isLoading:false
  // + data:null, and AuthGuard redirects to /login before the query ever runs.
  const [native, setNative] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setNative(isNative());
    setChecked(true);
  }, []);

  const session = useSession();
  const mobileQuery = useQuery({
    queryKey: ["mobile-user"],
    queryFn: fetchMobileUser,
    enabled: native,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  // Hold isLoading:true until we've determined platform — prevents AuthGuard
  // from seeing a false-unauthenticated state during hydration.
  if (!checked) {
    return { data: null, isLoading: true, status: "loading" as const };
  }

  if (native) {
    return {
      data: mobileQuery.data ?? null,
      isLoading: mobileQuery.isLoading,
      status: (
        mobileQuery.isLoading ? "loading" : mobileQuery.data ? "authenticated" : "unauthenticated"
      ) as "loading" | "authenticated" | "unauthenticated",
    };
  }

  return {
    data: session.data?.user ?? null,
    isLoading: session.status === "loading",
    status: session.status,
  };
}
