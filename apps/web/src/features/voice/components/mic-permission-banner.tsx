"use client";

import { useEffect, useState } from "react";
import { X, Mic } from "lucide-react";

// Shared localStorage keys — must match voice-fab.tsx and voice-input.tsx
export const MIC_PREF_KEY = "homebase_mic_pref";
const BANNER_DISMISSED_KEY = "homebase_mic_banner_dismissed";

// Custom events dispatched by voice components (same-tab communication)
export const MIC_DENIED_EVENT = "homebase_mic_denied";
export const MIC_GRANTED_EVENT = "homebase_mic_granted";

function getMicPref(): string | null {
  try { return localStorage.getItem(MIC_PREF_KEY); } catch { return null; }
}

function isBannerDismissed(): boolean {
  try { return localStorage.getItem(BANNER_DISMISSED_KEY) === "true"; } catch { return false; }
}

/**
 * One-time banner shown when microphone permission is denied.
 * Mounts in the app layout and:
 *  - Silently probes permission state via the Permissions API on load
 *    (works on Chrome/Firefox; Safari throws and we fall back to localStorage)
 *  - Listens for custom events from voice components for same-tab updates
 *  - Dismisses itself and remembers the dismissal in localStorage
 */
export function MicPermissionBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function maybeShow() {
      if (getMicPref() === "denied" && !isBannerDismissed()) {
        setShow(true);
      }
    }

    // Silently probe the Permissions API in the background.
    // On iOS Safari this API is unavailable for "microphone" and will throw —
    // we catch that and fall back to whatever is stored in localStorage.
    async function probe() {
      if (navigator.permissions?.query) {
        try {
          const status = await navigator.permissions.query({
            name: "microphone" as PermissionName,
          });
          if (status.state === "granted") {
            try { localStorage.setItem(MIC_PREF_KEY, "granted"); } catch { /* ignore */ }
            // If it was previously denied and now granted, clear the dismissal
            // so the banner can surface again if it ever gets denied in future.
            try { localStorage.removeItem(BANNER_DISMISSED_KEY); } catch { /* ignore */ }
          } else if (status.state === "denied") {
            try { localStorage.setItem(MIC_PREF_KEY, "denied"); } catch { /* ignore */ }
          }
          // "prompt" = we don't know yet; leave localStorage as-is
        } catch {
          // iOS Safari throws here — fall through to localStorage check
        }
      }
      maybeShow();
    }

    void probe();

    // Listen for same-tab updates dispatched by voice components
    function onDenied() {
      if (!isBannerDismissed()) setShow(true);
    }
    function onGranted() {
      setShow(false);
      try { localStorage.removeItem(BANNER_DISMISSED_KEY); } catch { /* ignore */ }
    }
    window.addEventListener(MIC_DENIED_EVENT, onDenied);
    window.addEventListener(MIC_GRANTED_EVENT, onGranted);
    return () => {
      window.removeEventListener(MIC_DENIED_EVENT, onDenied);
      window.removeEventListener(MIC_GRANTED_EVENT, onGranted);
    };
  }, []);

  function dismiss() {
    setShow(false);
    try { localStorage.setItem(BANNER_DISMISSED_KEY, "true"); } catch { /* ignore */ }
  }

  if (!show) return null;

  return (
    <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
      <Mic className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="flex-1">
        <span className="font-medium">Microphone access is blocked.</span>{" "}
        To use voice input on iOS, go to{" "}
        <span className="font-medium">Settings → Safari → Microphone</span>{" "}
        and allow access for this site.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss microphone banner"
        className="shrink-0 text-amber-600 transition-colors hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
