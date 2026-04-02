"use client";

import { useUserProfile, useUpdateUserProfile } from "@/features/auth/api/get-user-profile";
import { useQueryClient } from "@tanstack/react-query";

export function ReminderSettings() {
  const { data: profile } = useUserProfile();
  const { update } = useUpdateUserProfile();
  const queryClient = useQueryClient();

  async function handleChange(field: string, value: boolean | string) {
    await update({ [field]: value } as Parameters<typeof update>[0]);
    await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Daily reminder */}
      <div className="flex flex-col gap-3">
        <label className="flex items-center justify-between cursor-pointer gap-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium text-foreground">Daily reminder email</p>
            <p className="text-xs text-muted-foreground">
              Sends an email each morning listing tasks due that day.
            </p>
          </div>
          <input
            type="checkbox"
            checked={profile?.reminderDailyEnabled ?? false}
            onChange={(e) => void handleChange("reminderDailyEnabled", e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
          />
        </label>
        {profile?.reminderDailyEnabled && (
          <div className="flex items-center gap-2 pl-0">
            <label className="text-xs text-muted-foreground">Send at</label>
            <input
              type="time"
              value={profile.reminderDailyTime}
              onChange={(e) => void handleChange("reminderDailyTime", e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
            />
            <span className="text-xs text-muted-foreground">UTC</span>
          </div>
        )}
      </div>

      <div className="border-t border-border" />

      {/* Weekly reminder */}
      <div className="flex flex-col gap-3">
        <label className="flex items-center justify-between cursor-pointer gap-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium text-foreground">Weekly reminder email</p>
            <p className="text-xs text-muted-foreground">
              Sends an email every Monday morning listing tasks due that week.
            </p>
          </div>
          <input
            type="checkbox"
            checked={profile?.reminderWeeklyEnabled ?? false}
            onChange={(e) => void handleChange("reminderWeeklyEnabled", e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
          />
        </label>
        {profile?.reminderWeeklyEnabled && (
          <div className="flex items-center gap-2 pl-0">
            <label className="text-xs text-muted-foreground">Send at</label>
            <input
              type="time"
              value={profile.reminderWeeklyTime}
              onChange={(e) => void handleChange("reminderWeeklyTime", e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
            />
            <span className="text-xs text-muted-foreground">UTC</span>
          </div>
        )}
      </div>
    </div>
  );
}
