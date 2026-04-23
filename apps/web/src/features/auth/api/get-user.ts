"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { getMobileToken } from "@/lib/mobile-auth-storage";

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
  const isNative = Capacitor.isNativePlatform();

  // Both hooks must always be called (rules of hooks).
  // We select which result to expose based on platform.
  const session = useSession();
  const mobileQuery = useQuery({
    queryKey: ["mobile-user"],
    queryFn: fetchMobileUser,
    enabled: isNative,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  if (isNative) {
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
