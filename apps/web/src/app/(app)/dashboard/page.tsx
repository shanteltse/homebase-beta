"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTasks } from "@/features/tasks/api/get-tasks";
import { useUpdateTask } from "@/features/tasks/api/update-task";
import { useUserProfile } from "@/features/auth/api/get-user-profile";
import { useUser } from "@/features/auth/api/get-user";
import { useHouseholdMembers } from "@/features/household/api/get-members";
import { Spinner } from "@repo/ui/spinner";
import { TaskCard } from "@/features/tasks/components/task-card";
import { SmartTaskInput } from "@/features/ai/components/smart-task-input";
import { CreateTaskDialog } from "@/features/tasks/components/create-task-dialog";
import { ImportTasksDialog } from "@/features/tasks/components/import-tasks-dialog";
import { StatsCard } from "@/features/gamification/components/stats-card";
import { Upload } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import type { Task } from "@/types/task";
import type { TaskSort } from "@/features/tasks/hooks/use-task-filters";
import type { ParsedTask } from "@/features/ai/api/parse-task";

function getDateString(date: string | Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0] ?? "";
}

type DashboardView = "all" | "today" | "this-week";

const ASSIGNEE_FILTER_KEY = "hb_assignee_filter";
const SORT_KEY = "hb_sort";

export default function DashboardPage() {
  const { data: tasks, isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const { data: profile } = useUserProfile();
  const { data: user } = useUser();
  const { data: members } = useHouseholdMembers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPrefill, setDialogPrefill] = useState<ParsedTask | undefined>();
  const [importOpen, setImportOpen] = useState(false);
  const [dashboardView, setDashboardView] = useState<DashboardView>("all");
  const [assigneeFilter, setAssigneeFilterState] = useState<string>("");
  const [sort, setSortState] = useState<TaskSort>("due-date");

  useEffect(() => {
    const stored = localStorage.getItem(ASSIGNEE_FILTER_KEY) ?? "";
    setAssigneeFilterState(stored);
    const storedSort = localStorage.getItem(SORT_KEY) as TaskSort | null;
    if (storedSort) setSortState(storedSort);
  }, []);

  function setAssigneeFilter(value: string) {
    setAssigneeFilterState(value);
    if (value) {
      localStorage.setItem(ASSIGNEE_FILTER_KEY, value);
    } else {
      localStorage.removeItem(ASSIGNEE_FILTER_KEY);
    }
  }

  function setSort(value: TaskSort) {
    setSortState(value);
    localStorage.setItem(SORT_KEY, value);
  }

  function sortTasks(taskList: Task[]): Task[] {
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const memberNameById = new Map(
      (members ?? []).map((m) => [m.id, m.name ?? m.email]),
    );
    return [...taskList].sort((a, b) => {
      if (sort === "priority") {
        const diff = (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
        if (diff !== 0) return diff;
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      }
      if (sort === "assignee") {
        const nameA = a.assignee ? (memberNameById.get(a.assignee) ?? "") : "";
        const nameB = b.assignee ? (memberNameById.get(b.assignee) ?? "") : "";
        if (!nameA && nameB) return 1;
        if (nameA && !nameB) return -1;
        return nameA.localeCompare(nameB);
      }
      if (sort === "created") {
        return b.createdAt.localeCompare(a.createdAt);
      }
      // due-date: no due date goes last
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }

  const showMemberFilter = members && members.length > 1;

  const allTasks = (tasks ?? []) as Task[];
  const now = new Date();
  const today = getDateString(now);
  // End of this week = this Sunday (day 0). If today is Sunday, it's today.
  const daysUntilSunday = now.getDay() === 0 ? 0 : 7 - now.getDay();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + daysUntilSunday);
  const weekEndStr = getDateString(weekEnd);

  const rawActiveTasks = allTasks.filter((t) => !t.completed);

  // Recurring tasks: deduplicate by title (keep earliest instance per title).
  const earliestRecurringByTitle = new Map<string, string>();
  for (const t of rawActiveTasks) {
    if (!t.recurring || !t.dueDate) continue;
    const due = getDateString(t.dueDate);
    const existing = earliestRecurringByTitle.get(t.title);
    if (!existing || due < existing) earliestRecurringByTitle.set(t.title, due);
  }
  // allActiveTasks: deduplicated recurring, no date cutoff — used for "All" view
  const allActiveTasks = rawActiveTasks.filter((t) => {
    if (!t.recurring || !t.dueDate) return true;
    return getDateString(t.dueDate) === earliestRecurringByTitle.get(t.title);
  });
  // activeTasks: additionally capped at 7 days out — used for overdue/today/week views
  const sevenDaysOut = new Date(now);
  sevenDaysOut.setDate(now.getDate() + 7);
  const sevenDaysStr = getDateString(sevenDaysOut);
  const activeTasks = allActiveTasks.filter((t) => {
    if (!t.recurring || !t.dueDate) return true;
    return getDateString(t.dueDate) <= sevenDaysStr;
  });

  function applyAssigneeFilter(taskList: Task[]): Task[] {
    if (assigneeFilter === "mine") return taskList.filter((t) => t.assignee === user?.id);
    if (assigneeFilter) return taskList.filter((t) => t.assignee === assigneeFilter);
    return taskList;
  }

  const overdueTasks = sortTasks(applyAssigneeFilter(activeTasks.filter(
    (t) => t.dueDate && getDateString(t.dueDate) < today,
  )));
  const todayTasks = sortTasks(applyAssigneeFilter(activeTasks.filter(
    (t) => t.dueDate && getDateString(t.dueDate) === today,
  )));
  const thisWeekTasksAll = applyAssigneeFilter(activeTasks.filter((t) => {
    if (!t.dueDate) return false;
    const due = getDateString(t.dueDate);
    return due >= today && due <= weekEndStr;
  }));
  const thisWeekTasks = sortTasks(thisWeekTasksAll).slice(0, 5);
  const completedCount = allTasks.filter((t) => t.completed).length;

  const summaryTasks =
    dashboardView === "all"
      ? sortTasks(applyAssigneeFilter(allActiveTasks))
      : dashboardView === "today"
        ? todayTasks
        : thisWeekTasks;
  const summaryView =
    dashboardView === "all" ? "all" : dashboardView === "today" ? "today" : "this-week";

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
      <div className="flex flex-col gap-2">
        <SmartTaskInput onOpenCreateDialog={handleOpenCreateDialog} />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Import existing list
          </button>
        </div>
      </div>

      <CreateTaskDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setDialogPrefill(undefined);
        }}
        prefill={dialogPrefill}
      />

      <ImportTasksDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* Member filter — only shown when household has >1 member */}
      {showMemberFilter && (
        <Select
          value={assigneeFilter || "all"}
          onValueChange={(val) => setAssigneeFilter(val === "all" ? "" : val)}
        >
          <SelectTrigger className="w-[12rem]">
            <SelectValue placeholder="All members" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All members</SelectItem>
            <SelectItem value="mine">Mine</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name ?? m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Stats — only shown when user enables it in Settings */}
      {profile?.showTaskSummaryOnDashboard && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <p className="label text-muted-foreground">Today</p>
          <p className="stat text-foreground">
            {isLoading ? "—" : todayTasks.length}
          </p>
        </Link>
        <Link
          href="/tasks?view=this-week"
          className="flex flex-col gap-1 rounded-lg border border-border p-5 transition-colors hover:bg-muted/50"
        >
          <p className="label text-muted-foreground">This Week</p>
          <p className="stat text-foreground">
            {isLoading ? "—" : thisWeekTasksAll.length}
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
      </div>}

      {/* Gamification stats — only shown when user enables it in Settings */}
      {profile?.showStatsOnDashboard && <StatsCard />}

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

          {/* All / Today / This Week toggle section */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex gap-1 rounded-lg border border-border p-0.5">
                  {(["all", "today", "this-week"] as DashboardView[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setDashboardView(v)}
                      className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                        dashboardView === v
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {v === "all" ? "All" : v === "today" ? "Today" : "This Week"}
                    </button>
                  ))}
                </div>
                <Link href={`/tasks?view=${summaryView}`} className="caption text-primary hover:underline">
                  View all
                </Link>
              </div>
              <div className="flex justify-end">
                <Select value={sort} onValueChange={(val) => setSort(val as TaskSort)}>
                  <SelectTrigger className="h-8 text-xs w-[9rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due-date">Due Date</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="assignee">Assignee</SelectItem>
                    <SelectItem value="created">Date Created</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {summaryTasks.length > 0 ? (
              summaryTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={handleToggleComplete}
                />
              ))
            ) : (
              <div className="rounded-lg border border-border bg-muted/50 p-8 text-center body text-muted-foreground">
                {dashboardView === "all"
                  ? "No active tasks."
                  : dashboardView === "today"
                    ? "Nothing scheduled for today."
                    : "Nothing scheduled this week."}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
