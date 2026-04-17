import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { db } from "@/db";
import { achievements, tasks } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { ACHIEVEMENTS } from "@/features/gamification/achievements";
import { toLocalDateStr } from "@/lib/date-utils";

export async function POST() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  // Get existing achievements
  const existing = await db
    .select({ type: achievements.type })
    .from(achievements)
    .where(eq(achievements.userId, userId));

  const unlockedTypes = new Set(existing.map((a) => a.type));

  // Get completed task count
  const [taskCountResult] = await db
    .select({ value: count() })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.completed, true)));

  const completedCount = taskCountResult?.value ?? 0;

  // Fetch raw completedAt timestamps — bucket into local dates in JS
  // to avoid UTC-vs-local mismatch from SQL DATE() and EXTRACT(HOUR).
  const completedTasks = await db
    .select({ completedAt: tasks.completedAt, category: tasks.category })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.completed, true),
      ),
    );

  // Date bucketing in local time
  const localDates = completedTasks
    .filter((t) => t.completedAt != null)
    .map((t) => toLocalDateStr(t.completedAt!));

  const uniqueDatesDesc = [...new Set(localDates)].sort().reverse();

  // Calculate current streak from local-date-bucketed data
  const currentStreak = calculateStreak(uniqueDatesDesc);

  // Category set from fetched data
  const categorySet = new Set(completedTasks.map((t) => t.category).filter(Boolean));

  // Early bird / night owl using local hours
  const hasEarlyBird = completedTasks.some(
    (t) => t.completedAt != null && new Date(t.completedAt).getHours() < 8,
  );
  const hasNightOwl = completedTasks.some(
    (t) => t.completedAt != null && new Date(t.completedAt).getHours() >= 22,
  );

  // Determine which achievements should be unlocked
  const newlyUnlocked: string[] = [];

  const checks: [string, boolean][] = [
    ["first_task", completedCount >= 1],
    ["tasks_10", completedCount >= 10],
    ["tasks_50", completedCount >= 50],
    ["tasks_100", completedCount >= 100],
    ["streak_3", currentStreak >= 3],
    ["streak_7", currentStreak >= 7],
    ["streak_30", currentStreak >= 30],
    ["early_bird", hasEarlyBird],
    ["night_owl", hasNightOwl],
    [
      "all_categories",
      categorySet.has("family-home") &&
        categorySet.has("personal") &&
        categorySet.has("work-career"),
    ],
  ];

  for (const [type, earned] of checks) {
    if (earned && !unlockedTypes.has(type)) {
      newlyUnlocked.push(type);
    }
  }

  // Insert newly unlocked achievements
  if (newlyUnlocked.length > 0) {
    await db.insert(achievements).values(
      newlyUnlocked.map((type) => ({
        userId,
        type,
      })),
    );
  }

  // Return the full achievement definitions for newly unlocked
  const newAchievements = ACHIEVEMENTS.filter((a) =>
    newlyUnlocked.includes(a.id),
  );

  return NextResponse.json({
    newAchievements,
    stats: {
      completedCount,
      currentStreak,
      totalAchievements: unlockedTypes.size + newlyUnlocked.length,
    },
  });
}

function calculateStreak(sortedDatesDesc: string[]): number {
  if (sortedDatesDesc.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const firstDate = new Date(sortedDatesDesc[0]!);
  firstDate.setHours(0, 0, 0, 0);

  // Streak must include today or yesterday
  if (firstDate < yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sortedDatesDesc.length; i++) {
    const current = new Date(sortedDatesDesc[i]!);
    current.setHours(0, 0, 0, 0);
    const previous = new Date(sortedDatesDesc[i - 1]!);
    previous.setHours(0, 0, 0, 0);

    const diffMs = previous.getTime() - current.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
