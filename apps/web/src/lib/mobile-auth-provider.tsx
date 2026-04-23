"use client";

import { useEffect, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { getMobileToken } from "./mobile-auth-storage";

export function MobileAuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

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
