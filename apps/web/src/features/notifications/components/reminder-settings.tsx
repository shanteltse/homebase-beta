"use client";

import { useUserProfile, useUpdateUserProfile } from "@/features/auth/api/get-user-profile";
import { useQueryClient } from "@tanstack/react-query";

function utcTimeToLocal(utcTime: string): string {
  const [h, m] = utcTime.split(":").map(Number);
  const d = new Date();
  d.setUTCHours(h!, m!, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function localTimeToUtc(localTime: string): string {
  const [h, m] = localTime.split(":").map(Number);
  const d = new Date();
  d.setHours(h!, m!, 0, 0);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

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
              value={utcTimeToLocal(profile.reminderDailyTime)}
              onChange={(e) => void handleChange("reminderDailyTime", localTimeToUtc(e.target.value))}
              className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
            />
            <span className="text-xs text-muted-foreground">{localTimezone}</span>
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
              value={utcTimeToLocal(profile.reminderWeeklyTime)}
              onChange={(e) => void handleChange("reminderWeeklyTime", localTimeToUtc(e.target.value))}
              className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
            />
            <span className="text-xs text-muted-foreground">{localTimezone}</span>
          </div>
        )}
      </div>
    </div>
  );
}
