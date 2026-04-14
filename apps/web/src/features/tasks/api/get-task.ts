import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@/types/task";

async function fetchTask(taskId: string): Promise<Task> {
  const res = await fetch(`/api/tasks/${taskId}`);
  if (!res.ok) throw new Error("Task not found");
  return res.json();
}

export function useTask(taskId: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["tasks", taskId],
    queryFn: () => fetchTask(taskId),
    // Seed from the task list cache so state initializes correctly on first render
    // even if the individual-task cache is cold (e.g. after a mutation invalidation).
    initialData: () => {
      const list = queryClient.getQueryData<Task[]>(["tasks"]);
      return list?.find((t) => t.id === taskId);
    },
  });
}
