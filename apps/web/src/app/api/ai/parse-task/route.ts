export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthUser } from "@/lib/get-auth-user";
import { checkRateLimit } from "@/lib/rate-limit";
import { DEFAULT_CATEGORIES } from "@/types/category";
import { db } from "@/db";
import { users, householdMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Regex-based date extractor used by the fallback when the AI API is unavailable ──

function parseDateFromText(text: string): string | undefined {
  const lower = text.toLowerCase();
  const now = new Date();

  // Detect whether an explicit time is mentioned
  const hasExplicitTime =
    /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.test(lower) ||
    /\b\d{1,2}:\d{2}\b/.test(lower);

  function toDateOnly(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // Extract time component (e.g. "3pm", "3:30pm", "15:00")
  let hour = 12;
  const ampmMatch = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1]!, 10);
    const period = ampmMatch[3]!;
    if (period === "pm" && h !== 12) h += 12;
    if (period === "am" && h === 12) h = 0;
    hour = h;
  } else {
    const time24Match = lower.match(/\b(\d{1,2}):(\d{2})\b/);
    if (time24Match) hour = parseInt(time24Match[1]!, 10);
  }

  function atHour(d: Date): string {
    const r = new Date(d);
    r.setUTCHours(hour, 0, 0, 0);
    return r.toISOString();
  }

  // Returns date-only string if no time mentioned, full ISO if time present
  function resolve(d: Date): string {
    return hasExplicitTime ? atHour(d) : toDateOnly(d);
  }

  if (/\btoday\b/.test(lower)) return resolve(now);

  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return resolve(d);
  }

  if (/\bthis week\b|\bend of (?:the )?week\b/.test(lower)) {
    const d = new Date(now);
    const daysUntilSunday = now.getDay() === 0 ? 0 : 7 - now.getDay();
    d.setDate(d.getDate() + daysUntilSunday);
    if (!hasExplicitTime) return toDateOnly(d);
    d.setUTCHours(23, 59, 0, 0);
    return d.toISOString();
  }

  if (/\bnext week\b/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return resolve(d);
  }

  // Day-of-week: "on tuesday", "next friday", "this wednesday", bare "sunday" etc.
  const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayMatch = lower.match(
    /\b(?:on\s+|next\s+|this\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/
  );
  if (dayMatch) {
    const target = DAY_NAMES.indexOf(dayMatch[1]!);
    const d = new Date(now);
    let ahead = target - d.getDay();
    if (ahead <= 0) ahead += 7; // always pick a future occurrence
    d.setDate(d.getDate() + ahead);
    return resolve(d);
  }

  return undefined;
}

const categoryDescription = DEFAULT_CATEGORIES.map(
  (c) =>
    `${c.id} (${c.name}) — subcategories: ${c.subcategories.map((s) => s.id).join(", ")}`,
).join("\n");

const allSubcategoryIds = DEFAULT_CATEGORIES.flatMap((c) => c.subcategories.map((s) => s.id));

type HouseholdMemberRef = { id: string; name: string | null; email: string };

function buildDateContext() {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0]!;
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayDayName = dayNames[now.getDay()];
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0]!;
  const daysUntilSunday = now.getDay() === 0 ? 0 : 7 - now.getDay();
  const thisSunday = new Date(now);
  thisSunday.setDate(now.getDate() + daysUntilSunday);
  const thisSundayStr = thisSunday.toISOString().split("T")[0]!;
  const upcomingDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() + i + 1);
    return `${dayNames[d.getDay()]}: ${d.toISOString().split("T")[0]}`;
  }).join(", ");
  return { todayStr, todayDayName, tomorrowStr, thisSundayStr, upcomingDays };
}

function sharedFieldDocs() {
  return `Fields (omit if not applicable):
- title: string (core task description, cleaned up and concise)
- category: string (one of: family-home, personal, work-career)
- subcategory: string (one of the subcategory IDs if applicable)
- priority: "high" | "medium" | "low"
- dueDate: ISO 8601 UTC datetime (e.g. "2026-03-15T15:00:00.000Z")
- tags: string[] (relevant labels)
- notes: string (extra context not captured elsewhere)
- assignee: string (member ID — only if input clearly names a household member)`;
}

function sharedDateRules(ctx: ReturnType<typeof buildDateContext>) {
  return `DATE PARSING RULES — apply these exactly:
- "today" → ${ctx.todayStr}
- "tomorrow" → ${ctx.tomorrowStr}
- "this week" or "by end of week" → ${ctx.thisSundayStr}
- A day name like "Tuesday", "on Tuesday", "next Tuesday" → use the date from Upcoming days above
- If a time is explicitly mentioned (e.g. "3pm", "15:00", "at noon"), return a full ISO 8601 UTC string (e.g. "${ctx.tomorrowStr}T15:00:00.000Z")
- If only a date or vague timeframe is mentioned (e.g. "tomorrow", "next Tuesday", "this week") with no time, return the date only as YYYY-MM-DD (e.g. "${ctx.tomorrowStr}") with no time component
- ALWAYS include dueDate whenever any time reference is detected, even vague ones like "soon"
- If truly no time reference exists, omit dueDate`;
}

function memberBlock(members: HouseholdMemberRef[]) {
  return members.length > 0
    ? `Household members (for assignee detection):\n${members.map((m) => `- ${m.name ?? m.email} (id: "${m.id}")`).join("\n")}\nIf the input names a member, set assignee to their id. Otherwise omit.`
    : "No household members — omit assignee.";
}

function buildSystemPrompt(members: HouseholdMemberRef[] = []): string {
  const ctx = buildDateContext();
  return `You are a task parser. Extract structured task information from natural language input.

Available categories:
${categoryDescription}

Available priorities: high, medium, low.

TODAY IS ${ctx.todayDayName}, ${ctx.todayStr}.
Tomorrow: ${ctx.tomorrowStr}
End of this week (Sunday): ${ctx.thisSundayStr}
Upcoming days: ${ctx.upcomingDays}

${sharedDateRules(ctx)}

Return JSON with these fields (omit if not applicable):
- title: string (the core task description, cleaned up and concise)
- category: string (one of the category IDs: family-home, personal, work-career)
- subcategory: string (one of the subcategory IDs if applicable)
- priority: "high" | "medium" | "low"
- dueDate: if a time is explicitly mentioned, a full ISO 8601 UTC string (e.g. "2026-03-15T15:00:00.000Z"); if only a date or vague timeframe with no time, a date-only string (e.g. "2026-03-15")
- tags: string[] (any relevant tags or labels)
- notes: string (any additional context not captured in other fields)
- assignee: string (member ID — only set if the input clearly names a household member)

${memberBlock(members)}

Return ONLY valid JSON, no markdown, no explanation.`;
}

function buildMultiSystemPrompt(members: HouseholdMemberRef[] = []): string {
  const ctx = buildDateContext();
  return `You are a task parser. The user has provided multiple tasks. Extract each distinct task and return them as a JSON ARRAY.

IMPORTANT: The input may not have newlines — tasks may be pasted as a single line of space-separated phrases, separated by commas, semicolons, numbers, bullets, or just adjacent sentences. Split them into individual tasks regardless of formatting. Do not treat the entire input as one task.

Available categories:
${categoryDescription}

Available priorities: high, medium, low.

TODAY IS ${ctx.todayDayName}, ${ctx.todayStr}.
Tomorrow: ${ctx.tomorrowStr}
End of this week (Sunday): ${ctx.thisSundayStr}
Upcoming days: ${ctx.upcomingDays}

${sharedDateRules(ctx)}

${sharedFieldDocs()}

${memberBlock(members)}

Return ONLY a valid JSON array of task objects, no markdown, no explanation. Example: [{"title":"Buy groceries","category":"personal","priority":"medium"},{"title":"Call dentist","category":"personal","priority":"high"}]`;
}

function isMultiTaskInput(text: string): boolean {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2) return true;
  // Detect inline numbered or bulleted lists: "1. task 2. task" or "- task - task"
  const numbered = text.match(/\b\d+[.)]\s+\S/g);
  if (numbered && numbered.length >= 2) return true;
  const bulleted = text.match(/(?:^|\s)[-*•]\s+\S/g);
  if (bulleted && bulleted.length >= 2) return true;
  // Detect multiple capitalized sentences joined without newlines
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean);
  if (sentences.length >= 2) return true;
  // Detect 4+ words that look like separate task phrases (no punctuation separating them)
  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount >= 8 && text.split(/[,;]/).length >= 3) return true;
  return false;
}

function normalizeItem(item: Record<string, unknown>): Record<string, unknown> {
  const out = { ...item };
  if (!("dueDate" in out) && "due_date" in out) {
    out.dueDate = out.due_date;
    delete out.due_date;
  }
  return out;
}

function validateParsedItem(raw: Record<string, unknown>) {
  const item = normalizeItem(raw);
  const validCategoryIds = DEFAULT_CATEGORIES.map((c) => c.id);
  const validPriorities = ["high", "medium", "low"];

  const category =
    typeof item.category === "string" && validCategoryIds.includes(item.category)
      ? item.category
      : "personal";

  const priority =
    typeof item.priority === "string" && validPriorities.includes(item.priority)
      ? (item.priority as "high" | "medium" | "low")
      : "medium";

  const subcategory =
    typeof item.subcategory === "string" && allSubcategoryIds.includes(item.subcategory)
      ? item.subcategory
      : undefined;

  return {
    title: typeof item.title === "string" ? item.title : String(item.title ?? ""),
    category,
    priority,
    ...(subcategory ? { subcategory } : {}),
    ...(item.dueDate ? { dueDate: String(item.dueDate) } : {}),
    ...(Array.isArray(item.tags) ? { tags: (item.tags as unknown[]).map(String) } : {}),
    ...(item.notes ? { notes: String(item.notes) } : {}),
    ...(item.assignee ? { assignee: String(item.assignee) } : {}),
  };
}

export async function POST(request: Request) {
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
  const trimmedRaw = rawText.trim();

  if (!trimmedRaw) {
    return NextResponse.json({ error: "Text input is required" }, { status: 400 });
  }

  const multi = isMultiTaskInput(trimmedRaw);
  const text = trimmedRaw.slice(0, multi ? 2000 : 500);

  console.log("[parse-task] STEP 1 — received text:", JSON.stringify(text), "| multi:", multi);

  // Fetch household members so the AI can detect assignees by name
  const members: HouseholdMemberRef[] = [];
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

  // ── Multi-task path ──────────────────────────────────────────────────────
  if (multi) {
    try {
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: buildMultiSystemPrompt(members),
        messages: [{ role: "user", content: text }],
      });

      const content = message.content[0];
      if (!content || content.type !== "text") throw new Error("Unexpected response type");

      const rawJson = content.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed: unknown = JSON.parse(rawJson);
      if (!Array.isArray(parsed)) throw new Error("Expected array");

      const tasks = parsed
        .filter((item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && typeof (item as Record<string, unknown>).title === "string",
        )
        .map(validateParsedItem)
        .filter((t) => t.title.length > 0)
        .slice(0, 50);

      console.log("[parse-task] MULTI — returning", tasks.length, "tasks");
      return NextResponse.json({ tasks });
    } catch (error) {
      console.error("[parse-task] MULTI ERROR — falling back to single:", error);
      // Fall through to single-task path
    }
  }

  // ── Single-task path ─────────────────────────────────────────────────────
  try {
    const systemPrompt = buildSystemPrompt(members);

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: text }],
    });

    const content = message.content[0];
    if (!content || content.type !== "text") throw new Error("Unexpected response type");

    console.log("[parse-task] STEP 3 — raw AI response:", JSON.stringify(content.text));

    const rawJson = content.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(rawJson) as Record<string, unknown>;

    console.log("[parse-task] STEP 5 — dueDate field:", parsed.dueDate ?? "(not present)");

    const normalized = validateParsedItem(parsed);

    console.log("[parse-task] STEP 6 — returning to client:", JSON.stringify(normalized));
    return NextResponse.json({ parsed: normalized });
  } catch (error) {
    console.error("[parse-task] ERROR — parse failed, using fallback. Error:", error);

    const fallbackDueDate = parseDateFromText(text);
    const fallbackPriority = /\bhigh(?:\s+priority)?\b/.test(text.toLowerCase())
      ? "high"
      : /\blow(?:\s+priority)?\b/.test(text.toLowerCase())
        ? "low"
        : "medium";

    return NextResponse.json({
      parsed: {
        title: text || "New task",
        category: "personal",
        priority: fallbackPriority,
        ...(fallbackDueDate ? { dueDate: fallbackDueDate } : {}),
      },
    });
  }
}
