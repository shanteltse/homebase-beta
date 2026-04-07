export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthUser } from "@/lib/get-auth-user";
import { checkRateLimit } from "@/lib/rate-limit";
import { db } from "@/db";
import { users, householdMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_CATEGORIES } from "@/types/category";
import { handleApiError } from "@/lib/api-error";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ImportedTask = {
  title: string;
  priority: "high" | "medium" | "low";
  category: string;
  subcategory?: string;
  dueDate?: string;
  assignee?: string;
  notes?: string;
};

type MemberRef = { id: string; name: string | null; email: string };

function buildImportPrompt(members: MemberRef[]): string {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0]!;
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const upcomingDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() + i + 1);
    return `${dayNames[d.getDay()]}: ${d.toISOString().split("T")[0]}`;
  }).join(", ");

  const categoryIds = DEFAULT_CATEGORIES.map((c) => c.id).join(", ");

  return `You are a task list importer. The user will paste their to-do list in any format — numbered, bulleted, plain sentences, mixed formats, or even a brain dump. Extract every distinct task and return them as a JSON array.

TODAY IS ${todayStr}. Upcoming days: ${upcomingDays}

For each task extract:
- title: string — clean, concise task description (required)
- priority: "high" | "medium" | "low" — infer from urgency/importance words; default "medium"
- category: one of [${categoryIds}] — infer from context; default "personal"
- subcategory: one of [household-chores, meal-planning, work-tasks, finances, family-activities, self-care, errands, home-maintenance, health-fitness] — infer from context; omit if none fit
- dueDate: ISO 8601 UTC string (e.g. "2026-04-15T12:00:00.000Z") — only if a date or timeframe is mentioned
- assignee: member ID string — only if the input clearly names a household member
- notes: string — any extra context that doesn't fit the title; omit if empty

${members.length > 0
    ? `Household members for assignee detection:\n${members.map((m) => `- ${m.name ?? m.email} (id: "${m.id}")`).join("\n")}\nIf a task mentions one of these names, set assignee to their id.`
    : "No household members — omit assignee from all tasks."}

Rules:
- Split combined items into separate tasks (e.g. "buy milk and eggs" → two tasks if clearly separate)
- Preserve the user's intent — don't rewrite or embellish titles
- Ignore meta-text like "to-do list", "things to do", section headers that aren't tasks
- Return ONLY a valid JSON array, no markdown, no explanation

Example output: [{"title":"Schedule dentist appointment","priority":"medium","category":"personal","subcategory":"self-care"},{"title":"Pay electricity bill","priority":"high","category":"personal","subcategory":"finances","dueDate":"2026-04-01T12:00:00.000Z"}]`;
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed, retryAfterMs } = checkRateLimit(user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawText = typeof body.text === "string" ? body.text : "";
    const text = rawText.trim().slice(0, 5000); // larger limit for lists

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Fetch household members for assignee detection
    const members: MemberRef[] = [];
    try {
      const [membership] = await db
        .select({ householdId: householdMembers.householdId })
        .from(householdMembers)
        .where(eq(householdMembers.userId, user.id))
        .limit(1);

      if (membership) {
        const rows = await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(householdMembers)
          .innerJoin(users, eq(householdMembers.userId, users.id))
          .where(eq(householdMembers.householdId, membership.householdId));
        members.push(...rows);
      }
    } catch {
      // Non-fatal — continue without member context
    }

    const systemPrompt = buildImportPrompt(members);

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: text }],
    });

    const content = message.content[0];
    if (!content || content.type !== "text") {
      throw new Error("Unexpected AI response");
    }

    const rawJson = content.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed: unknown[] = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) throw new Error("Expected array");

    const validCategories = DEFAULT_CATEGORIES.map((c) => c.id);
    const validPriorities = ["high", "medium", "low"];

    const tasks: ImportedTask[] = parsed
      .filter((item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null && typeof (item as Record<string, unknown>).title === "string",
      )
      .map((item) => ({
        title: String(item.title).trim().slice(0, 200),
        priority: validPriorities.includes(String(item.priority))
          ? (item.priority as "high" | "medium" | "low")
          : "medium",
        category: validCategories.includes(String(item.category))
          ? String(item.category)
          : "personal",
        ...(item.subcategory ? { subcategory: String(item.subcategory) } : {}),
        ...(item.dueDate ? { dueDate: String(item.dueDate) } : {}),
        ...(item.assignee ? { assignee: String(item.assignee) } : {}),
        ...(item.notes ? { notes: String(item.notes) } : {}),
      }))
      .filter((t) => t.title.length > 0)
      .slice(0, 50); // cap at 50 tasks per import

    return NextResponse.json({ tasks });
  } catch (error) {
    return handleApiError(error);
  }
}
