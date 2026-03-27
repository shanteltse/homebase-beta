"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui/button";
import { useUserProfile } from "@/features/auth/api/get-user-profile";

const STORAGE_KEY = "homebase-welcome-seen";

export function WelcomeModal() {
  const { data: profile, isLoading } = useUserProfile();
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    // Only show for users who haven't completed or started onboarding
    if (!profile || profile.onboardingCompleted || profile.onboardingStep > 0) return;
    // Only show once ever
    if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) return;
    // Small delay so the app has a moment to render first
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, [isLoading, profile]);

  function handleSetUpNow() {
    markSeen();
    router.push("/onboarding");
  }

  function handleSkip() {
    markSeen();
    setVisible(false);
  }

  function markSeen() {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "1");
    }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to HomeBase"
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-7 shadow-xl animate-in zoom-in-95 duration-200 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-4xl">🏡</span>
          <h2 className="heading-sm text-foreground">Welcome to HomeBase!</h2>
          <p className="body text-muted-foreground">
            Want to set up your household? It only takes 2 minutes and personalizes your experience.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button variant="primary" className="w-full" onClick={handleSetUpNow}>
            Set Up Now
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleSkip}>
            Maybe Later
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          You can always set up in Settings whenever you&apos;re ready.
        </p>
      </div>
    </div>
  );
}
