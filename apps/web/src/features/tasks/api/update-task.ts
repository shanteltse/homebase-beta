import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCelebrationTrigger } from "@/features/gamification/hooks/use-completion-celebration";

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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (variables.completed === true) {
        triggerCheck();
      }
    },
  });
}
