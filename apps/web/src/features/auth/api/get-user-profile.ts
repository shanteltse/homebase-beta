import { useQuery } from "@tanstack/react-query";

export type UserProfile = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  onboardingCompleted: boolean;
  onboardingStep: number;
  notificationDailyRecap: boolean;
  notificationRecapTime: string;
  notificationMorningSummary: boolean;
  notificationTaskReminders: boolean;
  gcalConnected: boolean;
  gcalSyncEnabled: boolean;
  gcalSyncFrequency: "realtime" | "hourly" | "twice_daily";
  gcalSyncWhat: "all" | "starred" | "today_week";
  gcalIncludeNotes: boolean;
  gcalIncludeAssignee: boolean;
  gcalLastSync: string | null;
  voiceInputEnabled: boolean;
  voiceInputLanguage: string;
  voiceInputAutoSubmit: boolean;
  showStatsOnDashboard: boolean;
  showTaskSummaryOnDashboard: boolean;
  showGcalEvents: boolean;
  reminderDailyEnabled: boolean;
  reminderDailyTime: string;
  reminderWeeklyEnabled: boolean;
  reminderWeeklyTime: string;
  pwaInstalled: boolean;
  avatarColor: string | null;
  useGooglePhoto: boolean;
};

async function fetchUserProfile(): Promise<UserProfile> {
  const res = await fetch("/api/user/profile");
  if (!res.ok) throw new Error("Failed to fetch user profile");
  return res.json();
}

export function useUserProfile() {
  return useQuery({
    queryKey: ["user-profile"],
    queryFn: fetchUserProfile,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
}

export function useUpdateUserProfile() {
  return {
    update: async (data: Partial<UserProfile>): Promise<void> => {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update profile");
    },
  };
}
