"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { Task, TaskPriority } from "@/types/task";
import type { HouseholdMember } from "@/features/household/api/get-members";

export type TaskView = "all" | "overdue" | "today" | "this-week" | "upcoming" | "completed";
export type TaskSort = "due-date" | "priority" | "assignee" | "created";

const ASSIGNEE_FILTER_KEY = "hb_assignee_filter";
const SORT_KEY = "hb_sort";

export function useTaskFilters(currentUserId?: string, members?: HouseholdMember[]) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [assigneeFilter, setAssigneeFilterState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(ASSIGNEE_FILTER_KEY) ?? "";
  });

  const setAssigneeFilter = useCallback((value: string) => {
    setAssigneeFilterState(value);
    if (typeof window !== "undefined") {
      if (value) {
        localStorage.setItem(ASSIGNEE_FILTER_KEY, value);
      } else {
        localStorage.removeItem(ASSIGNEE_FILTER_KEY);
      }
    }
  }, []);

  const [sort, setSortState] = useState<TaskSort>(() => {
    if (typeof window === "undefined") return "due-date";
    return (localStorage.getItem(SORT_KEY) as TaskSort) ?? "due-date";
  });

  const setSort = useCallback((value: TaskSort) => {
    setSortState(value);
    if (typeof window !== "undefined") {
      localStorage.setItem(SORT_KEY, value);
    }
  }, []);

  const view = (searchParams.get("view") as TaskView) || "all";
  const category = searchParams.get("category") || "";
  const priority = (searchParams.get("priority") as TaskPriority) || "";

  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  const filterTasks = useMemo(() => {
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const memberNameById = new Map(
      (members ?? []).map((m) => [m.id, m.name ?? m.email]),
    );

    return (tasks: Task[]) => {
      let filtered = tasks;

      if (view === "completed") {
        filtered = filtered.filter((t) => t.completed);
      } else {
        filtered = filtered.filter((t) => !t.completed);
      }

      const today = new Date().toISOString().split("T")[0] ?? "";

      if (view === "overdue") {
        filtered = filtered.filter((t) => {
          if (!t.dueDate) return false;
          const due = t.dueDate.split("T")[0] ?? "";
          return due < today;
        });
      }

      if (view === "today") {
        filtered = filtered.filter((t) => {
          if (!t.dueDate) return false;
          const due = t.dueDate.split("T")[0] ?? "";
          return due <= today;
        });
      }

      if (view === "this-week") {
        const now = new Date();
        const daysUntilSunday = now.getDay() === 0 ? 0 : 7 - now.getDay();
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() + daysUntilSunday);
        const weekEndStr = weekEnd.toISOString().split("T")[0] ?? "";
        filtered = filtered.filter((t) => {
          if (!t.dueDate) return false;
          const due = t.dueDate.split("T")[0] ?? "";
          return due >= today && due <= weekEndStr;
        });
      }

      if (view === "upcoming") {
        filtered = filtered.filter((t) => {
          if (!t.dueDate) return false;
          const due = t.dueDate.split("T")[0] ?? "";
          return due > today;
        });
      }

      // Recurring tasks: only show the earliest upcoming instance per title,
      // and never show any instance more than 7 days out.
      if (view !== "completed") {
        const now = new Date();
        const sevenDaysOut = new Date(now);
        sevenDaysOut.setDate(now.getDate() + 7);
        const sevenDaysStr = sevenDaysOut.toISOString().split("T")[0]!;

        // Find the earliest due date for each recurring task title
        const earliestByTitle = new Map<string, string>();
        for (const t of filtered) {
          if (!t.recurring || !t.dueDate) continue;
          const due = t.dueDate.split("T")[0]!;
          const existing = earliestByTitle.get(t.title);
          if (!existing || due < existing) {
            earliestByTitle.set(t.title, due);
          }
        }

        filtered = filtered.filter((t) => {
          if (!t.recurring || !t.dueDate) return true;
          const due = t.dueDate.split("T")[0]!;
          // Never show more than 7 days out
          if (due > sevenDaysStr) return false;
          // Only show the earliest instance per title
          return due === earliestByTitle.get(t.title);
        });
      }

      if (assigneeFilter === "mine") {
        filtered = filtered.filter((t) => t.assignee === currentUserId);
      } else if (assigneeFilter) {
        filtered = filtered.filter((t) => t.assignee === assigneeFilter);
      }

      if (category) {
        filtered = filtered.filter((t) => t.category === category);
      }

      if (priority) {
        filtered = filtered.filter((t) => t.priority === priority);
      }

      return filtered.sort((a, b) => {
        if (sort === "priority") {
          const diff = (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
          if (diff !== 0) return diff;
          // tiebreak: due date
          if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          return 0;
        }

        if (sort === "assignee") {
          const nameA = a.assignee ? (memberNameById.get(a.assignee) ?? "") : "";
          const nameB = b.assignee ? (memberNameById.get(b.assignee) ?? "") : "";
          // Unassigned tasks go last
          if (!nameA && nameB) return 1;
          if (nameA && !nameB) return -1;
          return nameA.localeCompare(nameB);
        }

        if (sort === "created") {
          return b.createdAt.localeCompare(a.createdAt);
        }

        // Default: due-date — tasks without due date go last
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
    };
  }, [view, category, priority, sort, assigneeFilter, currentUserId, members]);

  return { view, category, priority, sort, setFilter, setSort, filterTasks, assigneeFilter, setAssigneeFilter };
}
