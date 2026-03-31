import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateTaskInput, Task } from "@/types/task";

async function createTask(input: CreateTaskInput): Promise<Task> {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to create task");
  return res.json();
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTask,
    onSuccess: (newTask) => {
      // Prepend the new task directly into the cache so all subscribers
      // (task list, dashboard, calendar) update immediately without a refetch.
      queryClient.setQueryData<Task[]>(["tasks"], (existing) =>
        existing ? [newTask, ...existing] : [newTask],
      );
    },
  });
}
