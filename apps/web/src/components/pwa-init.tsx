"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/register-sw";
import { setupOfflineSync } from "@/lib/offline-queue";

/**
 * Client component that initializes PWA features:
 * - Registers the service worker
 * - Sets up offline mutation replay
 * - Detects standalone/PWA mode and marks the user as pwa_installed
 *
 * Renders nothing — side-effect only.
 */
export function PwaInit() {
  useEffect(() => {
    registerServiceWorker();
    setupOfflineSync();

    if (
      window.matchMedia("(display-mode: standalone)").matches &&
      !sessionStorage.getItem("pwa_launch_tracked")
    ) {
      sessionStorage.setItem("pwa_launch_tracked", "1");
      fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pwaInstalled: true }),
      }).catch(() => {/* best-effort */});
    }
  }, []);

  return null;
}
