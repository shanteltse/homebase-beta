"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/register-sw";
import { setupOfflineSync } from "@/lib/offline-queue";

/**
 * Client component that initializes PWA features:
 * - Registers the service worker
 * - Sets up offline mutation replay
 *
 * Renders nothing — side-effect only.
 */
export function PwaInit() {
  useEffect(() => {
    registerServiceWorker();
    setupOfflineSync();
  }, []);

  return null;
}
