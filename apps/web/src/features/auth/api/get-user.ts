"use client";

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
  alert("[useUser] getMobileToken returned: " + (token ? token.slice(0, 20) + "..." : "NULL"));
  if (!token) return null;
  alert("[useUser] headers: " + JSON.stringify({ Authorization: "Bearer " + token.slice(0, 20) + "..." }));
  const res = await fetch("/api/user/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
  alert("[useUser] /api/user/profile status: " + res.status);
  if (!res.ok) return null;
  const profile = await res.json() as { id: string; name: string | null; email: string; image: string | null };
  return { id: profile.id, name: profile.name, email: profile.email, image: profile.image };
}

export function useUser() {
  const native = isNative();

  // Both hooks must always be called (rules of hooks).
  // We select which result to expose based on platform.
  const session = useSession();
  const mobileQuery = useQuery({
    queryKey: ["mobile-user"],
    queryFn: fetchMobileUser,
    enabled: native,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

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
