"use client";

import { useState } from "react";
import Link from "next/link";
import { useTasks } from "@/features/tasks/api/get-tasks";
import { useUpdateTask } from "@/features/tasks/api/update-task";
import { Spinner } from "@repo/ui/spinner";
import { TaskCard } from "@/features/tasks/components/task-card";
import { SmartTaskInput } from "@/features/ai/components/smart-task-input";
import { CreateTaskDialog } from "@/features/tasks/components/create-task-dialog";
import { StatsCard } from "@/features/gamification/components/stats-card";
import type { Task } from "@/types/task";
import type { ParsedTask } from "@/features/ai/api/parse-task";

function getDateString(date: string | Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0] ?? "";
}

export default function DashboardPage() {
  const { data: tasks, isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPrefill, setDialogPrefill] = useState<ParsedTask | undefined>();

  const allTasks = (tasks ?? []) as Task[];
  const today = getDateString(new Date());
  const activeTasks = allTasks.filter((t) => !t.completed);
  const overdueTasks = activeTasks.filter(
    (t) => t.dueDate && getDateString(t.dueDate) < today,
  );
  const todayTasks = activeTasks.filter(
    (t) => t.dueDate && getDateString(t.dueDate) === today,
  );
  const upcomingTasks = activeTasks
    .filter((t) => t.dueDate && getDateString(t.dueDate) > today)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 5);
  const completedCount = allTasks.filter((t) => t.completed).length;

  function handleToggleComplete(taskId: string, completed: boolean) {
    updateTask.mutate({ id: taskId, completed });
  }

  function handleOpenCreateDialog(prefill: ParsedTask) {
    setDialogPrefill(prefill);
    setDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="heading-md text-foreground">Here&apos;s the Rundown</h2>
        <p className="body text-muted-foreground">
          Your daily overview at a glance.
        </p>
      </div>

      {/* Smart quick add */}
      <SmartTaskInput onOpenCreateDialog={handleOpenCreateDialog} />

      <CreateTaskDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setDialogPrefill(undefined);
        }}
        prefill={dialogPrefill}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/tasks?view=overdue"
          className="flex flex-col gap-1 rounded-lg border border-border p-5 transition-colors hover:bg-muted/50"
        >
          <p className="label text-muted-foreground">Overdue</p>
          <p className="stat text-destructive">
            {isLoading ? "—" : overdueTasks.length}
          </p>
        </Link>
        <Link
          href="/tasks?view=today"
          className="flex flex-col gap-1 rounded-lg border border-border p-5 transition-colors hover:bg-muted/50"
        >
          <p className="label text-muted-foreground">Due Today</p>
          <p className="stat text-foreground">
            {isLoading ? "—" : todayTasks.length}
          </p>
        </Link>
        <Link
          href="/tasks?view=upcoming"
          className="flex flex-col gap-1 rounded-lg border border-border p-5 transition-colors hover:bg-muted/50"
        >
          <p className="label text-muted-foreground">Upcoming</p>
          <p className="stat text-foreground">
            {isLoading ? "—" : upcomingTasks.length}
          </p>
        </Link>
        <Link
          href="/tasks?view=completed"
          className="flex flex-col gap-1 rounded-lg border border-border p-5 transition-colors hover:bg-muted/50"
        >
          <p className="label text-muted-foreground">Completed</p>
          <p className="stat text-foreground">
            {isLoading ? "—" : completedCount}
          </p>
        </Link>
      </div>

      {/* Gamification stats */}
      <StatsCard />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <>
          {overdueTasks.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="heading-xs text-destructive">Overdue</h3>
                <Link href="/tasks?view=overdue" className="caption text-primary hover:underline">
                  View all
                </Link>
              </div>
              {overdueTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </div>
          )}

          {todayTasks.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="heading-xs text-foreground">Due Today</h3>
                <Link href="/tasks?view=today" className="caption text-primary hover:underline">
                  View all
                </Link>
              </div>
              {todayTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </div>
          )}

          {upcomingTasks.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="heading-xs text-foreground">Coming Up</h3>
                <Link href="/tasks?view=upcoming" className="caption text-primary hover:underline">
                  View all
                </Link>
              </div>
              {upcomingTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </div>
          )}

          {overdueTasks.length === 0 && todayTasks.length === 0 && upcomingTasks.length === 0 && (
            <div className="rounded-lg border border-border bg-muted/50 p-12 text-center body text-muted-foreground">
              You&apos;re all caught up! No tasks due today.
            </div>
          )}
        </>
      )}
    </div>
  );
}
