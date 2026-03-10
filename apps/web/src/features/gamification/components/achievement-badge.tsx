"use client";

import { cn } from "@/utils/cn";
import type { AchievementDef } from "@/features/gamification/achievements";

type AchievementBadgeProps = {
  achievement: AchievementDef;
  unlocked: boolean;
  unlockedAt?: string | null;
};

export function AchievementBadge({
  achievement,
  unlocked,
  unlockedAt,
}: AchievementBadgeProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-center transition-colors",
        unlocked
          ? "bg-background"
          : "bg-muted/50 opacity-50 grayscale",
      )}
    >
      <span className="text-3xl" role="img" aria-label={achievement.name}>
        {achievement.icon}
      </span>
      <div className="flex flex-col gap-0.5">
        <p className="label font-medium text-foreground">{achievement.name}</p>
        <p className="caption text-muted-foreground">
          {achievement.description}
        </p>
        {unlocked && unlockedAt && (
          <p className="caption text-muted-foreground/70">
            {new Date(unlockedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
