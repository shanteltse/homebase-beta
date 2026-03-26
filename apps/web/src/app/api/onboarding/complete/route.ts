export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { db } from "@/db";
import { users, tasks, onboardingMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handleApiError, ApiError } from "@/lib/api-error";
import { validateOrigin } from "@/lib/api-utils";

type OnboardingMember = {
  name: string;
  email?: string;
  relationship: "partner" | "child" | "roommate" | "other";
};

type StarterTaskDef = {
  title: string;
  category: string;
  subcategory?: string;
  priority: "high" | "medium" | "low";
  recurring?: { frequency: "weekly" | "monthly" };
};

const STARTER_TASKS_BY_SELECTION: Record<string, StarterTaskDef[]> = {
  "client-projects": [
    { title: "Review active client projects", category: "work-career", subcategory: "projects", priority: "high" },
    { title: "Update project timelines", category: "work-career", subcategory: "projects", priority: "medium" },
  ],
  "team-management": [
    { title: "Schedule 1:1 team check-ins", category: "work-career", subcategory: "meetings", priority: "medium" },
  ],
  "professional-development": [
    { title: "Set professional development goals", category: "work-career", subcategory: "professional-dev", priority: "medium" },
  ],
  "business-expenses": [
    { title: "Review and submit business expenses", category: "work-career", subcategory: "work-tasks", priority: "medium", recurring: { frequency: "monthly" } },
  ],
  "kids-activities": [
    { title: "Check school calendar for upcoming events", category: "family-home", subcategory: "family-activities", priority: "high" },
    { title: "Sign up for kids activities", category: "family-home", subcategory: "family-activities", priority: "medium" },
  ],
  "meal-planning": [
    { title: "Plan this week's meals", category: "family-home", subcategory: "meal-planning", priority: "medium", recurring: { frequency: "weekly" } },
    { title: "Grocery shopping", category: "family-home", subcategory: "meal-planning", priority: "medium", recurring: { frequency: "weekly" } },
  ],
  "household-chores": [
    { title: "Weekly home cleaning", category: "family-home", subcategory: "household-chores", priority: "medium", recurring: { frequency: "weekly" } },
    { title: "Organize one room or area", category: "family-home", subcategory: "household-chores", priority: "low" },
  ],
  "home-maintenance": [
    { title: "Inspect home for maintenance needs", category: "family-home", subcategory: "home-maintenance", priority: "medium" },
    { title: "Schedule seasonal home maintenance", category: "family-home", subcategory: "home-maintenance", priority: "low" },
  ],
  "family-events": [
    { title: "Plan upcoming family event", category: "family-home", subcategory: "family-activities", priority: "medium" },
  ],
  "pet-care": [
    { title: "Schedule vet appointment", category: "family-home", subcategory: "family-activities", priority: "medium" },
    { title: "Stock up on pet supplies", category: "family-home", subcategory: "errands", priority: "low" },
  ],
  "health-fitness": [
    { title: "Schedule a workout this week", category: "personal", subcategory: "health-fitness", priority: "medium", recurring: { frequency: "weekly" } },
  ],
  "medical-appointments": [
    { title: "Schedule annual physical exam", category: "personal", subcategory: "health-fitness", priority: "high" },
  ],
  "personal-finances": [
    { title: "Review monthly budget", category: "personal", subcategory: "finances", priority: "high", recurring: { frequency: "monthly" } },
    { title: "Set up bill payment reminders", category: "personal", subcategory: "finances", priority: "medium" },
  ],
  "self-care": [
    { title: "Schedule self-care time this week", category: "personal", subcategory: "self-care", priority: "medium", recurring: { frequency: "weekly" } },
  ],
  "travel-planning": [
    { title: "Research upcoming trip ideas", category: "personal", subcategory: "errands", priority: "low" },
  ],
};

export async function POST(request: Request) {
  try {
    if (!validateOrigin(request)) {
      throw new ApiError(403, "Forbidden");
    }

    const user = await getAuthUser(request);
    if (!user) {
      throw new ApiError(401, "Unauthorized");
    }

    const body = await request.json();
    const {
      name,
      members = [],
      selections = [],
      notificationDailyRecap = true,
      notificationRecapTime = "08:00",
      notificationMorningSummary = true,
      notificationTaskReminders = true,
    } = body as {
      name?: string;
      members?: OnboardingMember[];
      selections?: string[];
      notificationDailyRecap?: boolean;
      notificationRecapTime?: string;
      notificationMorningSummary?: boolean;
      notificationTaskReminders?: boolean;
    };

    // Update user profile and mark onboarding complete
    await db
      .update(users)
      .set({
        name: name?.trim().slice(0, 100) ?? undefined,
        onboardingCompleted: true,
        onboardingStep: 6,
        notificationDailyRecap,
        notificationRecapTime,
        notificationMorningSummary,
        notificationTaskReminders,
      })
      .where(eq(users.id, user.id));

    // Insert household members
    if (members.length > 0) {
      await db.insert(onboardingMembers).values(
        members
          .filter((m) => m.name?.trim())
          .map((m) => ({
            userId: user.id,
            name: m.name.trim().slice(0, 100),
            email: m.email?.trim() || null,
            relationship: m.relationship ?? "other",
          })),
      );
    }

    // Create starter tasks from selections
    const starterTasksToCreate: StarterTaskDef[] = [];
    for (const selectionKey of selections) {
      const defs = STARTER_TASKS_BY_SELECTION[selectionKey];
      if (defs) {
        starterTasksToCreate.push(...defs);
      }
    }

    // Deduplicate by title and limit to 10
    const seen = new Set<string>();
    const uniqueTasks = starterTasksToCreate.filter((t) => {
      if (seen.has(t.title)) return false;
      seen.add(t.title);
      return true;
    }).slice(0, 10);

    if (uniqueTasks.length > 0) {
      await db.insert(tasks).values(
        uniqueTasks.map((t) => ({
          userId: user.id,
          title: t.title,
          category: t.category,
          subcategory: t.subcategory,
          priority: t.priority,
          isStarter: true,
          subtasks: [],
          tags: [],
          links: [],
          recurring: t.recurring
            ? { frequency: t.recurring.frequency as "weekly" | "monthly" }
            : null,
        })),
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
