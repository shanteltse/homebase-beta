"use client";

import { useEffect, useState } from "react";
import { NotificationBell } from "@/features/notifications/components/notification-bell";

export function MobileHeader() {
  const [safeAreaTop, setSafeAreaTop] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isNative =
      typeof (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor !== "undefined" &&
      (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

    if (!isNative) return;

    // Probe element to measure env(safe-area-inset-top)
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;top:0;left:0;width:0;height:env(safe-area-inset-top,0px);pointer-events:none;visibility:hidden;";
    document.body.appendChild(probe);
    const measured = probe.getBoundingClientRect().height;
    document.body.removeChild(probe);

    // Fall back to 44px (standard iOS status bar) if env() returned 0
    setSafeAreaTop(measured > 0 ? measured : 44);
  }, []);

  return (
    <header className="flex shrink-0 flex-col border-b border-border bg-background md:hidden">
      {/* Status bar spacer — native only */}
      {safeAreaTop > 0 && <div style={{ height: safeAreaTop }} />}
      {/* Content row */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="heading-xs text-foreground">HomeBase</h1>
        <NotificationBell />
      </div>
    </header>
  );
}
