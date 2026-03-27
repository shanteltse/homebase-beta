export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthUser } from "@/lib/get-auth-user";
import { checkRateLimit } from "@/lib/rate-limit";
import { DEFAULT_CATEGORIES } from "@/types/category";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Regex-based date extractor used by the fallback when the AI API is unavailable ──

function parseDateFromText(text: string): string | undefined {
  const lower = text.toLowerCase();
  const now = new Date();

  // Extract time component (e.g. "3pm", "3:30pm", "15:00")
  let hour = 12; // default noon UTC
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

  if (/\btoday\b/.test(lower)) return atHour(now);

  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return atHour(d);
  }

  if (/\bthis week\b|\bend of (?:the )?week\b/.test(lower)) {
    const d = new Date(now);
    const daysUntilSunday = now.getDay() === 0 ? 0 : 7 - now.getDay();
    d.setDate(d.getDate() + daysUntilSunday);
    d.setUTCHours(23, 59, 0, 0);
    return d.toISOString();
  }

  if (/\bnext week\b/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return atHour(d);
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
    return atHour(d);
  }

  return undefined;
}

const categoryDescription = DEFAULT_CATEGORIES.map(
  (c) =>
    `${c.id} (${c.name}) — subcategories: ${c.subcategories.map((s) => s.id).join(", ")}`,
).join("\n");

function buildSystemPrompt(): string {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0]!;
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayDayName = dayNames[now.getDay()];

  // Tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0]!;

  // End of this week (Sunday)
  const daysUntilSunday = now.getDay() === 0 ? 0 : 7 - now.getDay();
  const thisSunday = new Date(now);
  thisSunday.setDate(now.getDate() + daysUntilSunday);
  const thisSundayStr = thisSunday.toISOString().split("T")[0]!;

  // Next 7 days by name (for day-of-week resolution)
  const upcomingDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() + i + 1);
    return `${dayNames[d.getDay()]}: ${d.toISOString().split("T")[0]}`;
  }).join(", ");

  return `You are a task parser. Extract structured task information from natural language input.

Available categories:
${categoryDescription}

Available priorities: high, medium, low.

TODAY IS ${todayDayName}, ${todayStr}.
Tomorrow: ${tomorrowStr}
End of this week (Sunday): ${thisSundayStr}
Upcoming days: ${upcomingDays}

DATE PARSING RULES — apply these exactly:
- "today" → ${todayStr}T12:00:00.000Z
- "tomorrow" → ${tomorrowStr}T12:00:00.000Z
- "this week" or "by end of week" → ${thisSundayStr}T23:59:00.000Z
- A day name like "Tuesday", "on Tuesday", "next Tuesday" → use the date from Upcoming days above
- A specific time like "3pm" → use that hour (24h UTC). If no time given, use T12:00:00.000Z
- ALWAYS include dueDate whenever any time reference is detected in the input, even vague ones like "soon" or "this week"
- If truly no time reference exists, omit dueDate

Return JSON with these fields (omit if not applicable):
- title: string (the core task description, cleaned up and concise)
- category: string (one of the category IDs: family-home, personal, work-career)
- subcategory: string (one of the subcategory IDs if applicable)
- priority: "high" | "medium" | "low"
- dueDate: ISO 8601 datetime string in UTC (e.g. "2026-03-15T15:00:00.000Z")
- tags: string[] (any relevant tags or labels)
- notes: string (any additional context not captured in other fields)

Return ONLY valid JSON, no markdown, no explanation.`;
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
  const text = rawText.trim().slice(0, 500);

  console.log("[parse-task] STEP 1 — received text:", JSON.stringify(text));

  if (!text) {
    return NextResponse.json(
      { error: "Text input is required" },
      { status: 400 },
    );
  }

  try {
    const systemPrompt = buildSystemPrompt();
    console.log("[parse-task] STEP 2 — system prompt (date section):", systemPrompt.split("DATE PARSING RULES")[0]?.split("TODAY IS")[1]?.trim().slice(0, 200));

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: text }],
    });

    const content = message.content[0];
    if (!content || content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    console.log("[parse-task] STEP 3 — raw AI response:", JSON.stringify(content.text));

    const rawJson = content.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    console.log("[parse-task] STEP 4 — cleaned JSON string:", rawJson);

    const parsed = JSON.parse(rawJson);

    console.log("[parse-task] STEP 5 — parsed object:", JSON.stringify(parsed));
    console.log("[parse-task] STEP 5 — dueDate field:", parsed.dueDate ?? "(not present)");

    // Normalize snake_case field names the AI sometimes returns despite instructions
    if (!("dueDate" in parsed) && "due_date" in parsed) {
      parsed.dueDate = parsed.due_date;
      delete parsed.due_date;
      console.log("[parse-task] STEP 5 — normalized due_date → dueDate:", parsed.dueDate);
    }

    // Validate category is one of the known IDs
    const validCategoryIds = DEFAULT_CATEGORIES.map((c) => c.id);
    if (parsed.category && !validCategoryIds.includes(parsed.category)) {
      parsed.category = "personal";
    }

    // Validate priority
    const validPriorities = ["high", "medium", "low"];
    if (parsed.priority && !validPriorities.includes(parsed.priority)) {
      parsed.priority = "medium";
    }

    console.log("[parse-task] STEP 6 — returning to client:", JSON.stringify(parsed));
    return NextResponse.json({ parsed });
  } catch (error) {
    console.error("[parse-task] ERROR — parse failed, using fallback. Error:", error);

    // Fallback: regex-parse what we can from the raw text (date, priority)
    const fallbackDueDate = parseDateFromText(text);
    const fallbackPriority =
      /\bhigh(?:\s+priority)?\b/.test(text.toLowerCase())
        ? "high"
        : /\blow(?:\s+priority)?\b/.test(text.toLowerCase())
          ? "low"
          : "medium";

    console.log("[parse-task] FALLBACK — dueDate:", fallbackDueDate ?? "(not found)");
    console.log("[parse-task] FALLBACK — priority:", fallbackPriority);

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
