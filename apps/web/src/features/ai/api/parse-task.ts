import { useMutation } from "@tanstack/react-query";

export type ParsedTask = {
  title?: string;
  category?: string;
  subcategory?: string;
  priority?: "high" | "medium" | "low";
  dueDate?: string;
  tags?: string[];
  notes?: string;
};

async function parseTask(text: string): Promise<ParsedTask> {
  console.log("[parseTask] CLIENT — submitting text:", JSON.stringify(text));
  const res = await fetch("/api/ai/parse-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to parse task");
  }
  const data = await res.json();
  console.log("[parseTask] CLIENT — received parsed:", JSON.stringify(data.parsed));
  console.log("[parseTask] CLIENT — dueDate received:", data.parsed?.dueDate ?? "(not present)");
  return data.parsed;
}

export function useParseTask() {
  return useMutation({
    mutationFn: parseTask,
  });
}
