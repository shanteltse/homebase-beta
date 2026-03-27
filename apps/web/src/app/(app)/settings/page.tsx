"use client";

import { useUser } from "@/features/auth/api/get-user";
import { useLogout } from "@/features/auth/api/logout";
import { useUserProfile, useUpdateUserProfile } from "@/features/auth/api/get-user-profile";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@repo/ui/button";
import { Spinner } from "@repo/ui/spinner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@repo/ui/card";
import { useRouter } from "next/navigation";
import { HouseholdSettings } from "@/features/household/components/household-settings";
import { NotificationSettings } from "@/features/notifications/components/notification-settings";
import { AchievementsGrid } from "@/features/gamification/components/achievements-grid";
import { GoogleCalendarSettings } from "@/features/calendar/components/google-calendar-settings";
import { Suspense } from "react";
import { Wand2 } from "lucide-react";

export default function SettingsPage() {
  const { data: user, isLoading } = useUser();
  const { data: profile } = useUserProfile();
  const { update: updateProfile } = useUpdateUserProfile();
  const queryClient = useQueryClient();
  const logout = useLogout();
  const router = useRouter();

  async function handleToggleStats(enabled: boolean) {
    await updateProfile({ showStatsOnDashboard: enabled });
    await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
  }

  function handleSignOut() {
    logout.mutate(undefined, {
      onSuccess: () => {
        router.push("/login");
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="heading-md text-foreground">Settings</h2>
        <p className="body text-muted-foreground">Manage your preferences.</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Setup Wizard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              {profile?.onboardingCompleted ? "Setup Wizard" : profile && profile.onboardingStep > 0 ? "Resume Setup" : "Setup Wizard"}
            </CardTitle>
            <CardDescription>
              {profile?.onboardingCompleted
                ? "Personalize your household, notifications, and starter tasks."
                : profile && profile.onboardingStep > 0
                  ? "You're partway through setup — pick up where you left off."
                  : "Set up your household in just a few minutes to personalize your experience."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push("/onboarding")} className="gap-2">
              <Wand2 className="h-4 w-4" />
              {profile?.onboardingCompleted ? "Re-run Setup" : profile && profile.onboardingStep > 0 ? "Resume Setup" : "Start Setup"}
            </Button>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <p className="label text-muted-foreground">Name</p>
                <p className="body text-foreground">
                  {user?.name ?? "—"}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="label text-muted-foreground">Email</p>
                <p className="body text-foreground">
                  {user?.email ?? "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard */}
        <Card>
          <CardHeader>
            <CardTitle>Dashboard</CardTitle>
            <CardDescription>Customize what appears on your dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex items-center justify-between cursor-pointer gap-4">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-foreground">Show Stats on Dashboard</p>
                <p className="text-xs text-muted-foreground">Display your task streak and achievement count on the dashboard.</p>
              </div>
              <input
                type="checkbox"
                checked={profile?.showStatsOnDashboard ?? false}
                onChange={(e) => void handleToggleStats(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
            </label>
          </CardContent>
        </Card>

        {/* Household */}
        <HouseholdSettings />

        {/* Google Calendar */}
        <Suspense fallback={null}>
          <GoogleCalendarSettings />
        </Suspense>

        {/* Notifications */}
        <NotificationSettings />

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle>Achievements</CardTitle>
            <CardDescription>Track your progress and unlock badges.</CardDescription>
          </CardHeader>
          <CardContent>
            <AchievementsGrid />
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how HomeBase looks.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="body text-muted-foreground">
              Theme toggle coming soon.
            </p>
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleSignOut}
              disabled={logout.isPending}
            >
              {logout.isPending ? "Signing out\u2026" : "Sign out"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
