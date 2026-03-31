"use client";

import { cn } from "@/utils/cn";
import type { Task } from "@/types/task";
import {
  getWeekDays,
  getTasksForDate,
  isToday,
} from "../hooks/use-calendar-state";
import { CalendarTaskItem } from "./calendar-task-item";
import { GCalEventItem } from "./gcal-event-item";
import { getGCalEventsForDate, type GCalExternalEvent } from "../api/get-gcal-events";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type WeekViewProps = {
  currentDate: Date;
  tasks: Task[];
  gcalEvents: GCalExternalEvent[];
  onDayClick: (date: Date) => void;
  onToggleComplete: (taskId: string, completed: boolean) => void;
};

export function WeekView({
  currentDate,
  tasks,
  gcalEvents,
  onDayClick,
  onToggleComplete,
}: WeekViewProps) {
  const allDays = getWeekDays(currentDate);
  // Mon–Sun order: move Sunday (index 0) to the end
  const days = [...allDays.slice(1), allDays[0]!];

  return (
    <div className="flex flex-col divide-y divide-border border border-border rounded-lg overflow-hidden">
      {days.map((day, i) => {
        const dayTasks = getTasksForDate(tasks, day);
        const dayGcal = getGCalEventsForDate(gcalEvents, day);
        const today = isToday(day);
        const hasItems = dayTasks.length > 0 || dayGcal.length > 0;

        return (
          <div
            key={i}
            className={cn(
              "flex items-start gap-3 p-3",
              today && "bg-primary/5",
            )}
          >
            {/* Day label — click to open day view */}
            <button
              type="button"
              onClick={() => onDayClick(day)}
              className="flex flex-col items-center w-12 shrink-0 gap-0.5 hover:opacity-75 transition-opacity"
            >
              <span className="text-xs font-medium text-muted-foreground">
                {DAY_NAMES[day.getDay()]}
              </span>
              <span
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                  today
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground",
                )}
              >
                {day.getDate()}
              </span>
            </button>

            {/* Tasks and GCal events displayed horizontally */}
            <div className="flex flex-wrap gap-1.5 flex-1 min-h-[2rem] items-start pt-0.5">
              {!hasItems ? (
                <span className="text-xs text-muted-foreground/50 self-center">
                  —
                </span>
              ) : (
                <>
                  {dayTasks.map((task) => (
                    <CalendarTaskItem
                      key={task.id}
                      task={task}
                      onToggleComplete={onToggleComplete}
                      compact
                    />
                  ))}
                  {dayGcal.map((event) => (
                    <GCalEventItem key={event.id} event={event} compact />
                  ))}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
