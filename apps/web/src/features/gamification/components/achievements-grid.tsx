"use client";

import { ACHIEVEMENTS } from "@/features/gamification/achievements";
import { useAchievements } from "@/features/gamification/api/get-achievements";
import { AchievementBadge } from "./achievement-badge";
import { Spinner } from "@repo/ui/spinner";

export function AchievementsGrid() {
  const { data: userAchievements, isLoading } = useAchievements();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  const unlockedMap = new Map(
    (userAchievements ?? []).map((a) => [a.type, a.unlockedAt]),
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {ACHIEVEMENTS.map((achievement) => (
        <AchievementBadge
          key={achievement.id}
          achievement={achievement}
          unlocked={unlockedMap.has(achievement.id)}
          unlockedAt={unlockedMap.get(achievement.id)}
        />
      ))}
    </div>
  );
}
