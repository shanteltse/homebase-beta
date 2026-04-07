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

export type ParseTaskResult =
  | { type: "single"; task: ParsedTask }
  | { type: "multi"; tasks: ParsedTask[] };

async function parseTask(text: string): Promise<ParseTaskResult> {
  console.log("[parseTask] CLIENT — submitting text:", JSON.stringify(text));
  const res = await fetch("/api/ai/parse-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to parse task");
  }
  const data = await res.json() as { parsed?: ParsedTask; tasks?: ParsedTask[] };
  if (data.tasks) {
    console.log("[parseTask] CLIENT — received multi:", data.tasks.length, "tasks");
    return { type: "multi", tasks: data.tasks };
  }
  console.log("[parseTask] CLIENT — received single:", JSON.stringify(data.parsed));
  return { type: "single", task: data.parsed ?? {} };
}

export function useParseTask() {
  return useMutation({
    mutationFn: parseTask,
  });
}
