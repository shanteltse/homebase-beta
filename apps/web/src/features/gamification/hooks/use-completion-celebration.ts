"use client";

import { create } from "zustand";
import type { AchievementDef } from "@/features/gamification/achievements";
import { useCheckAchievements } from "@/features/gamification/api/check-achievements";

type CelebrationState = {
  celebration: { achievement?: AchievementDef } | null;
  showCelebration: (achievement?: AchievementDef) => void;
  clearCelebration: () => void;
};

export const useCelebrationStore = create<CelebrationState>((set) => ({
  celebration: null,
  showCelebration: (achievement) => set({ celebration: { achievement } }),
  clearCelebration: () => set({ celebration: null }),
}));

export function useCelebrationTrigger() {
  const checkAchievements = useCheckAchievements();
  const showCelebration = useCelebrationStore((s) => s.showCelebration);

  function triggerCheck() {
    showCelebration(); // show immediately
    checkAchievements.mutate(undefined, {
      onSuccess: (data) => {
        if (data.newAchievements.length > 0) {
          showCelebration(data.newAchievements[0]); // upgrade if achievement unlocked
        }
      },
    });
  }

  return { triggerCheck };
}

export function useCelebration() {
  const celebration = useCelebrationStore((s) => s.celebration);
  const clearCelebration = useCelebrationStore((s) => s.clearCelebration);
  return { celebration, clearCelebration };
}
