import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCelebrationTrigger } from "@/features/gamification/hooks/use-completion-celebration";
import type { Task } from "@/types/task";

type UpdateTaskInput = {
  id: string;
  [key: string]: unknown;
};

async function updateTask({ id, ...fields }: UpdateTaskInput) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error("Failed to update task");
  return res.json();
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { triggerCheck } = useCelebrationTrigger();

  return useMutation({
    mutationFn: updateTask,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previous = queryClient.getQueryData(["tasks"]);
      queryClient.setQueryData<Task[]>(["tasks"], (old) =>
        old?.map((t) => t.id === variables.id ? { ...t, ...variables } : t) ?? []
      );
      if (variables.completed === true) triggerCheck();
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
