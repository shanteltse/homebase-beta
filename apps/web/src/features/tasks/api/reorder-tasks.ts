import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@/types/task";

type ReorderItem = { id: string; sortOrder: number };

async function reorderTasks(items: ReorderItem[]) {
  const res = await fetch("/api/tasks/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error("Failed to reorder tasks");
  return res.json();
}

export function useReorderTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reorderTasks,
    onMutate: async (items) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previous = queryClient.getQueryData(["tasks"]);

      const orderMap = new Map(items.map((i) => [i.id, i.sortOrder]));
      queryClient.setQueryData<Task[]>(["tasks"], (old) =>
        old?.map((t) =>
          orderMap.has(t.id) ? { ...t, sortOrder: orderMap.get(t.id) } : t,
        ) ?? [],
      );

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(["tasks"], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
