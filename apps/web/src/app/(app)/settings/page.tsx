"use client";

import { useState, useRef } from "react";
import { useUser } from "@/features/auth/api/get-user";
import { useLogout } from "@/features/auth/api/logout";
import { useUserProfile } from "@/features/auth/api/get-user-profile";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@repo/ui/button";
import { Spinner } from "@repo/ui/spinner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@repo/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui/tabs";
import { useRouter } from "next/navigation";
import { HouseholdSettings } from "@/features/household/components/household-settings";
import { NotificationSettings } from "@/features/notifications/components/notification-settings";
import { ReminderSettings } from "@/features/notifications/components/reminder-settings";
import { AchievementsGrid } from "@/features/gamification/components/achievements-grid";
// import { GoogleCalendarSettings } from "@/features/calendar/components/google-calendar-settings";
import { ImportTasksDialog } from "@/features/tasks/components/import-tasks-dialog";
import { Suspense } from "react";
import { Wand2, Upload, Pencil } from "lucide-react";

export default function SettingsPage() {
  const { data: user, isLoading } = useUser();
  const { data: profile } = useUserProfile();
  const logout = useLogout();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  function startEditName() {
    setEditNameValue(user?.name ?? "");
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  }

  async function handleSaveName() {
    const trimmed = editNameValue.trim();
    if (!trimmed || trimmed === user?.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to update name");
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      setEditingName(false);
    } catch {
      // keep editing open on error
    } finally {
      setSavingName(false);
    }
  }

  function handleNameBlur() {
    setTimeout(() => {
      if (!savingName) setEditingName(false);
    }, 150);
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
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        onBlur={handleNameBlur}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleSaveName();
                          if (e.key === "Escape") setEditingName(false);
                        }}
                        className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        maxLength={100}
                        disabled={savingName}
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => void handleSaveName()}
                        disabled={savingName || !editNameValue.trim()}
                        className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                      >
                        {savingName ? "Saving…" : "Save"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="body text-foreground">{user?.name ?? "—"}</p>
                      <button
                        type="button"
                        onClick={startEditName}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Edit name"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
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
