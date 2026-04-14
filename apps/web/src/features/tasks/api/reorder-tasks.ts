import { useMutation, useQueryClient } from "@tanstack/react-query";

type ReorderItem = { id: string };

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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
