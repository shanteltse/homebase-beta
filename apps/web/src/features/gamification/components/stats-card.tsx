"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@repo/ui/card";
import { useAchievements } from "@/features/gamification/api/get-achievements";
import { useTasks } from "@/features/tasks/api/get-tasks";
import { ACHIEVEMENTS } from "@/features/gamification/achievements";
import { toLocalDateStr } from "@/lib/date-utils";
import type { Task } from "@/types/task";

function calculateStreakFromTasks(tasks: Task[]): {
  current: number;
  best: number;
} {
  const completedDates = tasks
    .filter((t) => t.completed && t.completedAt)
    .map((t) => toLocalDateStr(t.completedAt!));

  const uniqueDates = [...new Set(completedDates)].sort().reverse();

  if (uniqueDates.length === 0) return { current: 0, best: 0 };

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayStr = toLocalDateStr(today);
  const yesterdayStr = toLocalDateStr(yesterday);

  const firstDate = uniqueDates[0]!;

  function daysBetween(a: string, b: string): number {
    return Math.round(
      (new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  // Calculate all streaks to find best
  let best = 1;
  let currentRun = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    if (daysBetween(uniqueDates[i - 1]!, uniqueDates[i]!) === 1) {
      currentRun++;
      best = Math.max(best, currentRun);
    } else {
      currentRun = 1;
    }
  }

  // Current streak: must include today or yesterday
  let current = 0;
  if (firstDate === todayStr || firstDate === yesterdayStr) {
    current = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      if (daysBetween(uniqueDates[i - 1]!, uniqueDates[i]!) === 1) {
        current++;
      } else {
        break;
      }
    }
  }

  return { current, best: Math.max(best, current) };
}

export function StatsCard() {
  const { data: tasks } = useTasks();
  const { data: userAchievements } = useAchievements();

  const allTasks = (tasks ?? []) as Task[];
  const completedCount = allTasks.filter((t) => t.completed).length;
  const streak = calculateStreakFromTasks(allTasks);
  const achievementCount = userAchievements?.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Your Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Tasks Done</p>
            <p className="text-sm font-semibold text-foreground">{completedCount}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Current Streak</p>
            <p className="text-sm font-semibold text-foreground">
              {streak.current} {streak.current === 1 ? "day" : "days"}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Best Streak</p>
            <p className="text-sm font-semibold text-foreground">
              {streak.best} {streak.best === 1 ? "day" : "days"}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Achievements</p>
            <p className="text-sm font-semibold text-foreground">
              {achievementCount}/{ACHIEVEMENTS.length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
