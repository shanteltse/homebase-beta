"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTasks } from "@/features/tasks/api/get-tasks";
import { useUpdateTask } from "@/features/tasks/api/update-task";
import { useUser } from "@/features/auth/api/get-user";
import { useHouseholdMembers } from "@/features/household/api/get-members";
import { Spinner } from "@repo/ui/spinner";
import { TaskCard } from "@/features/tasks/components/task-card";
import { SmartTaskInput, type SmartTaskInputHandle } from "@/features/ai/components/smart-task-input";
import { CreateTaskDialog } from "@/features/tasks/components/create-task-dialog";
import { ImportTasksDialog } from "@/features/tasks/components/import-tasks-dialog";
import { StatsCard } from "@/features/gamification/components/stats-card";
import { MemberAvatar } from "@/features/household/components/member-avatar";
import { Upload, ArrowUpDown, Check, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@repo/ui/dropdown-menu";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import type { Task } from "@/types/task";
import { cn } from "@/utils/cn";
import type { TaskSort } from "@/features/tasks/hooks/use-task-filters";
import type { ParsedTask } from "@/features/ai/api/parse-task";

function getDateString(date: string | Date | null | undefined): string {
  if (!date) return "";
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  if (typeof date === "string" && date.length > 10) return date.split("T")[0]!;
  return new Date(date).toLocaleDateString("en-CA");
}

type DashboardView = "all" | "today" | "this-week";

const ASSIGNEE_FILTER_KEY = "hb_assignee_filter";
const SORT_KEY = "hb_sort";
const SHOW_OVERVIEW_KEY = "hb_show_overview";

export default function DashboardPage() {
  const { data: tasks, isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const { data: user } = useUser();
  const { data: members } = useHouseholdMembers();
  const router = useRouter();
  const smartInputRef = useRef<SmartTaskInputHandle>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPrefill, setDialogPrefill] = useState<ParsedTask | undefined>();
  const [importOpen, setImportOpen] = useState(false);
  const [dashboardView, setDashboardView] = useState<DashboardView>("all");
  const [assigneeFilter, setAssigneeFilterState] = useState<string>("");
  const [sort, setSortState] = useState<TaskSort>("due-date");
  const [showOverview, setShowOverviewState] = useState(true);
  const [openDashFilter, setOpenDashFilter] = useState<"members" | "sort" | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(ASSIGNEE_FILTER_KEY) ?? "";
    setAssigneeFilterState(stored);
    const storedSort = localStorage.getItem(SORT_KEY) as TaskSort | null;
    if (storedSort) setSortState(storedSort);
    const storedOverview = localStorage.getItem(SHOW_OVERVIEW_KEY);
    if (storedOverview !== null) setShowOverviewState(storedOverview !== "false");
  }, []);

  function setShowOverview(value: boolean) {
    setShowOverviewState(value);
    localStorage.setItem(SHOW_OVERVIEW_KEY, String(value));
  }

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
      // Starred tasks always float to top
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;
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


  const focusTasks = summaryTasks.filter((t) => t.starred);
  const nonFocusTasks = summaryTasks.filter((t) => !t.starred);

  function handleToggleComplete(taskId: string, completed: boolean) {
    updateTask.mutate({ id: taskId, completed });
  }

  function handleToggleStar(taskId: string, starred: boolean) {
    updateTask.mutate({ id: taskId, starred });
  }

  function handleOpenCreateDialog(prefill: ParsedTask) {
    setDialogPrefill(prefill);
    setDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-3 pt-0 min-w-0 overflow-x-hidden">
      <div className="flex flex-col gap-0.5">
        <h2 className="heading-md text-foreground">Here&apos;s the Rundown</h2>
        <p className="body text-muted-foreground">
          Your daily overview at a glance.
        </p>
      </div>

      {/* Smart quick add */}
      <div className="flex flex-col gap-2">
        <SmartTaskInput
          ref={smartInputRef}
          onOpenCreateDialog={handleOpenCreateDialog}
          rightLabel={
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Import list
            </button>
          }
        />
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

      {/* Dashboard overview (summary + stats) */}
      {showOverview ? (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setShowOverview(false)}
            className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground transition-colors -mt-2 mb-0"
          >
            <X className="h-3 w-3" />
            Hide overview
          </button>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-medium mb-3">At a Glance</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Link href="/tasks?view=overdue" className="flex flex-col gap-1 transition-colors hover:opacity-70">
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className={cn("text-sm font-semibold", !isLoading && overdueTasks.length === 0 ? "text-green-600 dark:text-green-400" : "text-destructive")}>
                  {isLoading ? "—" : overdueTasks.length}
                </p>
              </Link>
              <Link href="/tasks?view=today" className="flex flex-col gap-1 transition-colors hover:opacity-70">
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="text-sm font-semibold text-foreground">
                  {isLoading ? "—" : todayTasks.length}
                </p>
              </Link>
              <Link href="/tasks?view=this-week" className="flex flex-col gap-1 transition-colors hover:opacity-70">
                <p className="text-xs text-muted-foreground">This Week</p>
                <p className="text-sm font-semibold text-foreground">
                  {isLoading ? "—" : thisWeekTasksAll.length}
                </p>
              </Link>
              <Link href="/tasks?view=completed" className="flex flex-col gap-1 transition-colors hover:opacity-70">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-sm font-semibold text-foreground">
                  {isLoading ? "—" : completedCount}
                </p>
              </Link>
            </div>
          </div>
          <StatsCard />
          {showMemberFilter && (
            <div className="grid grid-cols-2 gap-2">
              {(members ?? []).map((member) => {
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                const memberTasks = allTasks.filter((t) => t.assignee === member.id);
                const activeCount = memberTasks.filter((t) => !t.completed).length;
                const completedThisWeek = memberTasks.filter(
                  (t) => t.completed && t.completedAt && new Date(t.completedAt) >= sevenDaysAgo,
                ).length;
                const total = activeCount + completedThisWeek;
                const pct = total > 0 ? Math.round((completedThisWeek / total) * 100) : 0;
                return (
                  <div
                    key={member.id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2.5"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MemberAvatar name={member.name} image={member.image} size="sm" avatarColor={member.avatarColor} useGooglePhoto={member.useGooglePhoto} />
                      <span className="text-xs font-medium text-foreground truncate">
                        {member.name ?? member.email}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {completedThisWeek}/{total} done this week ({pct}%)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowOverview(true)}
          className="self-start text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          + Show overview
        </button>
      )}

      <div>
      {!isLoading && allActiveTasks.length === 0 ? (
        <div className="flex flex-col items-center gap-5 py-16 text-center">
          <div className="text-4xl">📋</div>
          <div className="flex flex-col gap-1.5">
            <h3 className="heading-sm text-foreground">What&apos;s on your plate?</h3>
            <p className="body text-muted-foreground">
              Add your first task and start making progress.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              smartInputRef.current?.focus();
              document.getElementById("main-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2 rounded-xl border-2 border-dashed border-primary/40 px-8 py-4 text-sm font-medium text-primary transition-all hover:border-primary hover:bg-primary/5 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add a task
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <>
          {/* All / Today / This Week toggle section */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              {/* Overlay — captures first tap on iOS to close open dropdown */}
              {openDashFilter !== null && (
                <div className="fixed inset-0 z-[45]" onClick={() => setOpenDashFilter(null)} />
              )}
              {/* Single row: toggle pills (left) + member filter + sort (right) */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1 rounded-lg border border-border p-0.5">
                  {(["all", "today", "this-week"] as DashboardView[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setDashboardView(v)}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                        dashboardView === v
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {v === "all" ? "All" : v === "today" ? "Today" : "This Week"}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {showMemberFilter && (
                    <Select
                      open={openDashFilter === "members"}
                      onOpenChange={(isOpen) => setOpenDashFilter(isOpen ? "members" : null)}
                      value={assigneeFilter || "all"}
                      onValueChange={(val) => {
                        setAssigneeFilter(val === "all" ? "" : val);
                        setOpenDashFilter(null);
                      }}
                    >
                      <SelectTrigger className="h-7 w-[7rem] text-xs px-2">
                        <SelectValue placeholder="All members" />
                      </SelectTrigger>
                      <SelectContent className="z-50">
                        <SelectItem value="all">All members</SelectItem>
                        <SelectItem value="mine">Mine</SelectItem>
                        {members.filter((m) => m.id !== user?.id).map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name ?? m.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <DropdownMenu
                    open={openDashFilter === "sort"}
                    onOpenChange={(isOpen) => setOpenDashFilter(isOpen ? "sort" : null)}
                  >
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label="Sort tasks"
                      >
                        <ArrowUpDown className="h-3 w-3" />
                        <span className="hidden md:inline">
                          {sort === "due-date" ? "Due date" : sort === "priority" ? "Priority" : sort === "assignee" ? "Assignee" : sort === "created" ? "Date created" : "Sort"}
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-50">
                      {(["due-date", "priority", "assignee", "created"] as const).map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => { setSort(s); setOpenDashFilter(null); }}
                          className="flex items-center justify-between gap-4"
                        >
                          {s === "due-date" ? "Due Date" : s === "priority" ? "Priority" : s === "assignee" ? "Assignee" : "Date Created"}
                          {sort === s && <Check className="h-3.5 w-3.5 text-primary" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {focusTasks.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="heading-xs text-primary">Your Focus</h3>
                <div className="overflow-hidden rounded-lg border border-border border-l-2 border-l-primary divide-y divide-border">
                  {focusTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      compact
                      grouped
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onToggleStar={handleToggleStar}
                      onTagClick={(t) => router.push(`/tasks?tag=${encodeURIComponent(t)}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {nonFocusTasks.length > 0 ? (
              <div className={cn("flex flex-col gap-3", focusTasks.length > 0 && "mt-3")}>
                {focusTasks.length > 0 && <h3 className="heading-xs text-muted-foreground">Everything Else</h3>}
                <div className="overflow-hidden rounded-lg border border-border divide-y divide-border">
                  {nonFocusTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      compact
                      grouped
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onToggleStar={handleToggleStar}
                      onTagClick={(t) => router.push(`/tasks?tag=${encodeURIComponent(t)}`)}
                    />
                  ))}
                </div>
              </div>
            ) : focusTasks.length === 0 ? (
              <div className="rounded-lg border border-border bg-muted/50 p-8 text-center body text-muted-foreground">
                {dashboardView === "all"
                  ? "No active tasks."
                  : dashboardView === "today"
                    ? "Nothing scheduled for today."
                    : "Nothing scheduled this week."}
              </div>
            ) : null}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
