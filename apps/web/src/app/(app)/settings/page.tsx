"use client";

import { useUser } from "@/features/auth/api/get-user";
import { useLogout } from "@/features/auth/api/logout";
import { Button } from "@repo/ui/button";
import { Spinner } from "@repo/ui/spinner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@repo/ui/card";
import { useRouter } from "next/navigation";
import { HouseholdSettings } from "@/features/household/components/household-settings";
import { NotificationSettings } from "@/features/notifications/components/notification-settings";
import { AchievementsGrid } from "@/features/gamification/components/achievements-grid";

export default function SettingsPage() {
  const { data: user, isLoading } = useUser();
  const logout = useLogout();
  const router = useRouter();

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

        {/* Household */}
        <HouseholdSettings />

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
