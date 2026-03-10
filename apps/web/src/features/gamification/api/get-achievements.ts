import { useQuery } from "@tanstack/react-query";

export type UserAchievement = {
  id: string;
  userId: string;
  type: string;
  unlockedAt: string;
};

async function fetchAchievements(): Promise<UserAchievement[]> {
  const res = await fetch("/api/achievements");
  if (!res.ok) throw new Error("Failed to fetch achievements");
  return res.json();
}

export function useAchievements() {
  return useQuery({
    queryKey: ["achievements"],
    queryFn: fetchAchievements,
  });
}
