"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Sparkles } from "lucide-react";
import { useUserProfile } from "@/features/auth/api/get-user-profile";

const STORAGE_KEY = "homebase-setup-banner-dismissed";
const MAX_DISMISSALS = 3;

function getDismissCount(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(STORAGE_KEY) ?? 0);
}

function incrementDismissCount() {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, String(getDismissCount() + 1));
}

export function SetupBanner() {
  const { data: profile, isLoading } = useUserProfile();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!profile || profile.onboardingCompleted) return;
    if (getDismissCount() >= MAX_DISMISSALS) return;
    setVisible(true);
  }, [isLoading, profile]);

  function handleDismiss() {
    incrementDismissCount();
    setVisible(false);
  }

  if (!visible) return null;

  const isPartial = profile && profile.onboardingStep > 0 && !profile.onboardingCompleted;
  const label = isPartial ? "Resume setup" : "Set Up";

  return (
    <div className="flex items-center gap-3 border-b border-primary/20 bg-primary/8 px-4 py-2.5 animate-in slide-in-from-top duration-300">
      <Sparkles className="h-4 w-4 shrink-0 text-primary" />
      <p className="flex-1 text-sm text-foreground">
        {isPartial
          ? "You're halfway through setup — pick up where you left off."
          : "Complete setup to unlock household features, voice input, and calendar sync."}
      </p>
      <Link
        href="/onboarding"
        className="shrink-0 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {label}
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss setup banner"
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
