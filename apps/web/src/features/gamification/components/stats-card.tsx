"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@repo/ui/card";
import { useAchievements } from "@/features/gamification/api/get-achievements";
import { useTasks } from "@/features/tasks/api/get-tasks";
import { ACHIEVEMENTS } from "@/features/gamification/achievements";
import type { Task } from "@/types/task";

function calculateStreakFromTasks(tasks: Task[]): {
  current: number;
  best: number;
} {
  const completedDates = tasks
    .filter((t) => t.completed && t.completedAt)
    .map((t) => {
      const d = new Date(t.completedAt!);
      d.setHours(0, 0, 0, 0);
      return d.toISOString().split("T")[0]!;
    });

  const uniqueDates = [...new Set(completedDates)].sort().reverse();

  if (uniqueDates.length === 0) return { current: 0, best: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const firstDate = new Date(uniqueDates[0]!);
  firstDate.setHours(0, 0, 0, 0);

  // Calculate all streaks to find best
  let best = 1;
  let currentRun = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const curr = new Date(uniqueDates[i]!);
    const prev = new Date(uniqueDates[i - 1]!);
    const diffDays = Math.round(
      (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 1) {
      currentRun++;
      best = Math.max(best, currentRun);
    } else {
      currentRun = 1;
    }
  }

  // Current streak: must include today or yesterday
  let current = 0;
  if (firstDate >= yesterday) {
    current = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const curr = new Date(uniqueDates[i]!);
      const prev = new Date(uniqueDates[i - 1]!);
      const diffDays = Math.round(
        (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays === 1) {
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
        <CardTitle>Your Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <p className="label text-muted-foreground">Tasks Done</p>
            <p className="stat text-foreground">{completedCount}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="label text-muted-foreground">Current Streak</p>
            <p className="stat text-foreground">
              {streak.current} {streak.current === 1 ? "day" : "days"}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="label text-muted-foreground">Best Streak</p>
            <p className="stat text-foreground">
              {streak.best} {streak.best === 1 ? "day" : "days"}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="label text-muted-foreground">Achievements</p>
            <p className="stat text-foreground">
              {achievementCount}/{ACHIEVEMENTS.length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
