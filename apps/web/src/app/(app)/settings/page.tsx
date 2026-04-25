"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/features/auth/api/get-user";
import { useLogout } from "@/features/auth/api/logout";
import { useUserProfile } from "@/features/auth/api/get-user-profile";
import { Button } from "@repo/ui/button";
import { Spinner } from "@repo/ui/spinner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@repo/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui/tabs";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { HouseholdSettings } from "@/features/household/components/household-settings";
import { NotificationSettings } from "@/features/notifications/components/notification-settings";
import { ReminderSettings } from "@/features/notifications/components/reminder-settings";
import { AchievementsGrid } from "@/features/gamification/components/achievements-grid";
// import { GoogleCalendarSettings } from "@/features/calendar/components/google-calendar-settings";
import { ImportTasksDialog } from "@/features/tasks/components/import-tasks-dialog";
import { Suspense } from "react";
import { Wand2, Upload, RotateCcw } from "lucide-react";

const APP_OPEN_COUNT_KEY = "appOpenCount";
const REDO_ONBOARDING_THRESHOLD = 20;

export default function SettingsPage() {
  const { data: user, isLoading } = useUser();
  const { data: profile } = useUserProfile();
  const logout = useLogout();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const [appOpenCount, setAppOpenCount] = useState<number>(Infinity);
  const [isRedoingOnboarding, setIsRedoingOnboarding] = useState(false);

  useEffect(() => {
    setAppOpenCount(Number(localStorage.getItem(APP_OPEN_COUNT_KEY) ?? Infinity));
  }, []);

  async function handleRedoOnboarding() {
    setIsRedoingOnboarding(true);
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingCompleted: false, onboardingStep: 0 }),
      });
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      router.push("/onboarding");
    } finally {
      setIsRedoingOnboarding(false);
    }
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="heading-md text-foreground">Settings</h2>
        <p className="body text-muted-foreground">Manage your preferences.</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="flex w-full">
          <TabsTrigger value="general" className="flex-1 px-1 text-xs sm:px-3 sm:text-sm">General</TabsTrigger>
          <TabsTrigger value="notifications" className="flex-1 px-1 text-xs sm:px-3 sm:text-sm">Notifications</TabsTrigger>
          {/* <TabsTrigger value="calendar" className="flex-1 px-1 text-xs sm:px-3 sm:text-sm">Calendar</TabsTrigger> */}
          <TabsTrigger value="account" className="flex-1 px-1 text-xs sm:px-3 sm:text-sm">Account</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="flex flex-col gap-6 mt-4">
          {/* Setup Wizard — only show when onboarding is not yet complete */}
          {!profile?.onboardingCompleted && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  {profile && profile.onboardingStep > 0 ? "Resume Setup" : "Setup Wizard"}
                </CardTitle>
                <CardDescription>
                  {profile && profile.onboardingStep > 0
                    ? "You're partway through setup — pick up where you left off."
                    : "Set up your household in just a few minutes to personalize your experience."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => router.push("/onboarding")} className="gap-2">
                  <Wand2 className="h-4 w-4" />
                  {profile && profile.onboardingStep > 0 ? "Resume Setup" : "Start Setup"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Redo Onboarding — visible for first 20 app opens */}
          {appOpenCount <= REDO_ONBOARDING_THRESHOLD && profile?.onboardingCompleted && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Redo Onboarding
                </CardTitle>
                <CardDescription>
                  Walk through the setup wizard again to update your household or preferences.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={handleRedoOnboarding} disabled={isRedoingOnboarding} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  {isRedoingOnboarding ? "Starting…" : "Redo Setup"}
                </Button>
              </CardContent>
            </Card>
          )}

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
                  <p className="body text-foreground">{user?.name ?? "—"}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="label text-muted-foreground">Email</p>
                  <p className="body text-foreground">{user?.email ?? "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Import Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Tasks
              </CardTitle>
              <CardDescription>
                Already have a to-do list? Paste it and we&apos;ll add all your tasks automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Import your list
              </Button>
            </CardContent>
          </Card>

          <ImportTasksDialog open={importOpen} onOpenChange={setImportOpen} />

          {/* Household */}
          <HouseholdSettings />

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

        </TabsContent>

        {/* Notifications & Reminders Tab */}
        <TabsContent value="notifications" className="flex flex-col gap-6 mt-4">
          <NotificationSettings />

          <Card>
            <CardHeader>
              <CardTitle>Email Reminders</CardTitle>
              <CardDescription>Receive scheduled emails about your upcoming tasks.</CardDescription>
            </CardHeader>
            <CardContent>
              <ReminderSettings />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Tab — hidden
        <TabsContent value="calendar" className="flex flex-col gap-6 mt-4">
          <Suspense fallback={null}>
            <GoogleCalendarSettings />
          </Suspense>
        </TabsContent>
        */}

        {/* Account Tab */}
        <TabsContent value="account" className="flex flex-col gap-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Manage your account and session.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-foreground">Password</p>
                <p className="text-xs text-muted-foreground">
                  Need to change your password?{" "}
                  <a href="/forgot-password" className="text-primary underline underline-offset-2">
                    Reset it here
                  </a>
                  .
                </p>
              </div>
              <div className="border-t border-border" />
              <div>
                <Button
                  variant="destructive"
                  onClick={handleSignOut}
                  disabled={logout.isPending}
                >
                  {logout.isPending ? "Signing out\u2026" : "Sign out"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
