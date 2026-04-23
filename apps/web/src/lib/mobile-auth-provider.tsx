"use client";

import { useEffect, type ReactNode } from "react";
import { getMobileToken } from "./mobile-auth-storage";

function isNative(): boolean {
  return typeof window !== "undefined" &&
    !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.();
}

export function MobileAuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!isNative()) return;

    const original = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;

      const isApiCall = url.startsWith("/api/") || url.includes("/api/");

      if (isApiCall) {
        const token = await getMobileToken();
        if (token) {
          init = {
            ...init,
            headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
          };
        }
      }

      return original(input as RequestInfo, init);
    };

    return () => {
      window.fetch = original;
    };
  }, []);

  return <>{children}</>;
}
