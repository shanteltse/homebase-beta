"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { Task } from "@/types/task";

export type CalendarView = "month" | "week" | "day";

export function useCalendarState() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const view: CalendarView = (searchParams.get("view") as CalendarView) ?? "month";

  const currentDate = useMemo(() => {
    const dateParam = searchParams.get("date");
    if (dateParam) {
      // Parse as local time to avoid UTC-offset shifting the displayed day
      const [y, m, d] = dateParam.split("-").map(Number);
      return new Date(y!, m! - 1, d!);
    }
    return new Date();
  }, [searchParams]);

  const setParams = useCallback(
    (newView: CalendarView, newDate: Date) => {
      const params = new URLSearchParams();
      params.set("view", newView);
      params.set("date", formatDateParam(newDate));
      router.push(`/calendar?${params.toString()}`);
    },
    [router],
  );

  const setView = useCallback(
    (newView: CalendarView) => {
      setParams(newView, currentDate);
    },
    [setParams, currentDate],
  );

  const goNext = useCallback(() => {
    const next = new Date(currentDate);
    if (view === "month") {
      next.setMonth(next.getMonth() + 1);
    } else if (view === "week") {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    setParams(view, next);
  }, [currentDate, view, setParams]);

  const goPrev = useCallback(() => {
    const prev = new Date(currentDate);
    if (view === "month") {
      prev.setMonth(prev.getMonth() - 1);
    } else if (view === "week") {
      prev.setDate(prev.getDate() - 7);
    } else {
      prev.setDate(prev.getDate() - 1);
    }
    setParams(view, prev);
  }, [currentDate, view, setParams]);

  const goToday = useCallback(() => {
    setParams(view, new Date());
  }, [view, setParams]);

  const goToDate = useCallback(
    (date: Date, targetView?: CalendarView) => {
      setParams(targetView ?? view, date);
    },
    [view, setParams],
  );

  return {
    currentDate,
    view,
    setView,
    goNext,
    goPrev,
    goToday,
    goToDate,
  };
}

// --- Utility functions ---

function formatDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns all dates to display in a month grid (6 rows x 7 cols).
 * Includes trailing days from the previous month and leading days from the next.
 */
export function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay(); // 0=Sun

  const start = new Date(year, month, 1 - startDow);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

/**
 * Returns the 7 dates of the week containing the given date (Sun-Sat).
 */
export function getWeekDays(date: Date): Date[] {
  const dow = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - dow);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

/**
 * Filters tasks that fall on a specific date (comparing year/month/day).
 */
export function getTasksForDate(tasks: Task[], date: Date): Task[] {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  return tasks.filter((task) => {
    if (!task.dueDate) return false;
    const due = new Date(task.dueDate);
    return due.getFullYear() === y && due.getMonth() === m && due.getDate() === d;
  });
}

/**
 * Check if two dates represent the same calendar day.
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Check if a date is today.
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}
