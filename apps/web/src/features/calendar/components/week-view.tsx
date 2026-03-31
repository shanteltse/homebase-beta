"use client";

import { cn } from "@/utils/cn";
import type { Task } from "@/types/task";
import {
  getWeekDays,
  getTasksForDate,
  isToday,
} from "../hooks/use-calendar-state";
import { CalendarTaskItem } from "./calendar-task-item";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type WeekViewProps = {
  currentDate: Date;
  tasks: Task[];
  onDayClick: (date: Date) => void;
  onToggleComplete: (taskId: string, completed: boolean) => void;
};

export function WeekView({
  currentDate,
  tasks,
  onDayClick,
  onToggleComplete,
}: WeekViewProps) {
  const days = getWeekDays(currentDate);

  return (
    <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
    <div className="grid grid-cols-7 divide-x divide-border border border-border rounded-lg overflow-hidden min-w-[560px]">
      {days.map((day, i) => {
        const dayTasks = getTasksForDate(tasks, day);
        const today = isToday(day);

        return (
          <div
            key={i}
            className={cn(
              "flex min-h-[400px] flex-col",
              today && "bg-primary/5",
            )}
          >
            {/* Day header */}
            <button
              type="button"
              onClick={() => onDayClick(day)}
              className="flex flex-col items-center gap-0.5 border-b border-border px-2 py-3 transition-colors hover:bg-muted/50"
            >
              <span className="caption font-medium text-muted-foreground">
                {DAY_NAMES[i]}
              </span>
              <span
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                  today && "bg-primary text-primary-foreground",
                  !today && "text-foreground",
                )}
              >
                {day.getDate()}
              </span>
            </button>

            {/* Tasks */}
            <div className="flex flex-1 flex-col gap-1 p-1.5">
              {dayTasks.length === 0 ? (
                <span className="mt-4 text-center text-xs text-muted-foreground">
                  No tasks
                </span>
              ) : (
                dayTasks.map((task) => (
                  <CalendarTaskItem
                    key={task.id}
                    task={task}
                    onToggleComplete={onToggleComplete}
                    compact
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}
