"use client";

import { Spinner } from "@repo/ui/spinner";
import { TaskCard } from "./task-card";
import { TaskFilters } from "./task-filters";
import { useTaskFilters } from "../hooks/use-task-filters";
import { useTasks } from "../api/get-tasks";
import { useUpdateTask } from "../api/update-task";
import { useUser } from "@/features/auth/api/get-user";
import { useHouseholdMembers } from "@/features/household/api/get-members";
import { DEFAULT_CATEGORIES } from "@/types/category";
import type { Task } from "@/types/task";

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function getSubcategoryName(subcategoryId: string): string {
  for (const cat of DEFAULT_CATEGORIES) {
    const sub = cat.subcategories.find((s) => s.id === subcategoryId);
    if (sub) return sub.name;
  }
  return subcategoryId;
}

function groupBySubcategory(tasks: Task[]): { key: string; name: string; tasks: Task[] }[] {
  const groups = new Map<string, { name: string; tasks: Task[] }>();

  for (const task of tasks) {
    const key = task.subcategory ?? "__other__";
    if (!groups.has(key)) {
      groups.set(key, {
        name: key === "__other__" ? "Other" : getSubcategoryName(key),
        tasks: [],
      });
    }
    groups.get(key)!.tasks.push(task);
  }

  for (const group of groups.values()) {
    group.tasks.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1));
  }

  return Array.from(groups.entries())
    .sort(([keyA, groupA], [keyB, groupB]) => {
      if (keyA === "__other__") return 1;
      if (keyB === "__other__") return -1;
      return groupA.name.localeCompare(groupB.name);
    })
    .map(([key, group]) => ({ key, ...group }));
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
            : view === "starred"
              ? "No starred tasks. Star a task to add it to your focus list for today."
              : "No tasks found. Create one to get started!"}
        </div>
      ) : view === "all" ? (
        <div className="flex flex-col gap-4">
          {groupBySubcategory(filtered).map(({ key, name, tasks }) => (
            <div key={key} className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                {name}
              </p>
              {tasks.map((task) => (
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
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleComplete={handleToggleComplete}
              onToggleStar={handleToggleStar}
              onTagClick={(t) => setFilter("tag", t)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
