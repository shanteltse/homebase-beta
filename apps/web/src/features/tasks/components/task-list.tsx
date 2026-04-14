"use client";

import { Spinner } from "@repo/ui/spinner";
import { TaskCard } from "./task-card";
import { TaskFilters } from "./task-filters";
import { useTaskFilters } from "../hooks/use-task-filters";
import { useTasks } from "../api/get-tasks";
import { useUpdateTask } from "../api/update-task";
import { useUser } from "@/features/auth/api/get-user";
import { useHouseholdMembers } from "@/features/household/api/get-members";
import type { Task } from "@/types/task";

const SUBCATEGORY_LABELS: Record<string, string> = {
  "household-chores": "Household Chores",
  "meal-planning": "Meal Planning",
  "work-tasks": "Work Tasks",
  "finances": "Finances",
  "family-activities": "Family Activities",
  "self-care": "Self-Care",
  "errands": "Errands",
  "home-maintenance": "Home Maintenance",
  "health-fitness": "Health & Fitness",
  "": "Other",
};

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function groupAndSort(tasks: Task[]): Array<{ key: string; tasks: Task[] }> {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = task.subcategory ?? "";
    const bucket = map.get(key) ?? [];
    bucket.push(task);
    map.set(key, bucket);
  }

  const sortedKeys = Array.from(map.keys()).sort((a, b) => {
    if (a === "") return 1;
    if (b === "") return -1;
    return a.localeCompare(b);
  });

  return sortedKeys.map((key) => ({
    key,
    tasks: (map.get(key) ?? []).sort(
      (a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1),
    ),
  }));
}

export function TaskList() {
  const { data: tasks, isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const { data: user } = useUser();
  const { data: members } = useHouseholdMembers();
  const { view, category, priority, tag, sort, setFilter, setSort, filterTasks, assigneeFilter, setAssigneeFilter } =
    useTaskFilters(user?.id, members);

  function handleToggleComplete(taskId: string, completed: boolean) {
    updateTask.mutate({ id: taskId, completed });
  }

  function handleToggleStar(taskId: string, starred: boolean) {
    updateTask.mutate({ id: taskId, starred });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const filtered = filterTasks(tasks ?? []);
  const groups = groupAndSort(filtered);

  return (
    <div className="flex flex-col gap-6">
      <TaskFilters
        view={view}
        category={category}
        priority={priority}
        tag={tag}
        sort={sort}
        onFilterChange={setFilter}
        onSortChange={setSort}
        members={members}
        currentUserId={user?.id}
        assigneeFilter={assigneeFilter}
        onAssigneeFilterChange={setAssigneeFilter}
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/50 p-12 text-center body text-muted-foreground">
          {view === "completed"
            ? "No completed tasks yet."
            : "No tasks found. Create one to get started!"}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(({ key, tasks: groupTasks }) => (
            <div key={key} className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {SUBCATEGORY_LABELS[key] ?? key}
              </p>
              {groupTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={handleToggleComplete}
                  onToggleStar={handleToggleStar}
                  onTagClick={(t) => setFilter("tag", t)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
