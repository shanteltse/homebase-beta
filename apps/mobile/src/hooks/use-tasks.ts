import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Task, CreateTaskInput, UpdateTaskInput } from "@repo/shared/types/task";

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: () => api<Task[]>("/api/tasks"),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      api<Task>("/api/tasks", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (newTask) => {
      // Optimistically prepend to cache, then revalidate
      queryClient.setQueryData<Task[]>(["tasks"], (old) =>
        old ? [newTask, ...old] : [newTask]
      );
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateTaskInput & { id: string }) =>
      api<Task>(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previous = queryClient.getQueryData<Task[]>(["tasks"]);

      // Optimistic update — apply changes instantly
      queryClient.setQueryData<Task[]>(["tasks"], (old) =>
        old?.map((t) => {
          if (t.id !== variables.id) return t;
          return {
            ...t,
            ...variables,
            // UpdateTaskInput allows null to clear these fields; Task only allows undefined
            recurring:
              variables.recurring === null
                ? undefined
                : (variables.recurring ?? t.recurring),
            contact:
              variables.contact === null
                ? undefined
                : (variables.contact ?? t.contact),
          };
        })
      );

      return { previous };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(["tasks"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/api/tasks/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previous = queryClient.getQueryData<Task[]>(["tasks"]);

      // Optimistic removal
      queryClient.setQueryData<Task[]>(["tasks"], (old) =>
        old?.filter((t) => t.id !== id)
      );

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tasks"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
