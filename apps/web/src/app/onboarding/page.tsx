"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@repo/ui/spinner";
import { useUser } from "@/features/auth/api/get-user";
import { useUserProfile } from "@/features/auth/api/get-user-profile";
import { OnboardingWizard } from "@/features/onboarding/components/onboarding-wizard";

export default function OnboardingPage() {
  const { data: user, isLoading: userLoading } = useUser();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const isLoading = userLoading || (!!user && profileLoading);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  // Resume from saved step (1 if not started, or re-run from step 1 if already completed)
  const savedStep = profile?.onboardingStep ?? 1;
  const initialStep = savedStep > 0 && !profile?.onboardingCompleted ? savedStep : 1;

  return (
    <OnboardingWizard
      userName={user.name ?? ""}
      userEmail={user.email ?? ""}
      initialStep={initialStep}
    />
  );
}
