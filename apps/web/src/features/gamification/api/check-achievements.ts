import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AchievementDef } from "@/features/gamification/achievements";

export type CheckAchievementsResponse = {
  newAchievements: AchievementDef[];
  stats: {
    completedCount: number;
    currentStreak: number;
    totalAchievements: number;
  };
};

async function checkAchievements(): Promise<CheckAchievementsResponse> {
  const res = await fetch("/api/achievements/check", {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to check achievements");
  return res.json();
}

export function useCheckAchievements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: checkAchievements,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
    },
  });
}
