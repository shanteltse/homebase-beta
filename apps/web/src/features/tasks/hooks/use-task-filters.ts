"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { Task, TaskPriority } from "@/types/task";

export type TaskView = "all" | "overdue" | "today" | "this-week" | "upcoming" | "completed";
export type TaskSort = "due-date" | "priority" | "created" | "alphabetical";

export function useTaskFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const view = (searchParams.get("view") as TaskView) || "all";
  const category = searchParams.get("category") || "";
  const priority = (searchParams.get("priority") as TaskPriority) || "";
  const sort = (searchParams.get("sort") as TaskSort) || "due-date";

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

      // Hide recurring task instances due beyond the current week (Mon–Sun).
      // They'll re-appear once they fall within the week, or can be seen via "upcoming".
      if (view !== "upcoming" && view !== "this-week" && view !== "completed") {
        const weekEnd = new Date();
        // Days until Sunday: Sun=0 → +0, Mon=1 → +6, Tue=2 → +5, …, Sat=6 → +1
        const daysUntilSunday = (7 - weekEnd.getDay()) % 7;
        weekEnd.setDate(weekEnd.getDate() + daysUntilSunday);
        weekEnd.setHours(23, 59, 59, 999);
        const weekEndStr = weekEnd.toISOString().split("T")[0]!;
        filtered = filtered.filter((t) => {
          if (!t.recurring || !t.dueDate) return true;
          const due = t.dueDate.split("T")[0]!;
          return due <= weekEndStr;
        });
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
        }

        if (sort === "alphabetical") {
          return a.title.localeCompare(b.title);
        }

        if (sort === "created") {
          return b.createdAt.localeCompare(a.createdAt);
        }

        // Default: due-date
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
    };
  }, [view, category, priority, sort]);

  return { view, category, priority, sort, setFilter, filterTasks };
}
