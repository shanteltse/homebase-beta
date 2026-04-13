"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/utils/cn";
import type { Task } from "@/types/task";
import {
  getMonthDays,
  getTasksForDate,
  isToday,
} from "../hooks/use-calendar-state";
import { CalendarTaskItem } from "./calendar-task-item";
import { GCalEventItem } from "./gcal-event-item";
import { getGCalEventsForDate, type GCalExternalEvent } from "../api/get-gcal-events";

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE = 3;

type MonthViewProps = {
  currentDate: Date;
  tasks: Task[];
  gcalEvents: GCalExternalEvent[];
  onDayClick: (date: Date) => void;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onNext: () => void;
  onPrev: () => void;
};

export function MonthView({
  currentDate,
  tasks,
  gcalEvents,
  onDayClick,
  onToggleComplete,
  onNext,
  onPrev,
}: MonthViewProps) {
  const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
  const currentMonth = currentDate.getMonth();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      if (e.deltaY > 0) onNext();
      else onPrev();
    }

    let touchStartX = 0;
    function handleTouchStart(e: TouchEvent) {
      touchStartX = e.touches[0]?.clientX ?? 0;
    }
    function handleTouchEnd(e: TouchEvent) {
      const delta = touchStartX - (e.changedTouches[0]?.clientX ?? 0);
      if (Math.abs(delta) > 50) {
        if (delta > 0) onNext();
        else onPrev();
      }
    }

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onNext, onPrev]);

  return (
    <div ref={containerRef} className="flex flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_HEADERS.map((day) => (
          <div
            key={day}
            className="px-2 py-2 text-center caption font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dayTasks = getTasksForDate(tasks, day);
          const dayGcal = getGCalEventsForDate(gcalEvents, day);
          const isCurrentMonth = day.getMonth() === currentMonth;
          const today = isToday(day);

          // Interleave tasks first, then GCal events; cap total visible
          const totalCount = dayTasks.length + dayGcal.length;
          const overflow = totalCount - MAX_VISIBLE;

          return (
            <button
              key={i}
              type="button"
              onClick={() => onDayClick(day)}
              className={cn(
                "flex min-h-[120px] flex-col border-b border-r border-border p-1.5 text-left transition-colors hover:bg-muted/50",
                !isCurrentMonth && "bg-muted/30",
                i % 7 === 0 && "border-l",
              )}
            >
              <span
                className={cn(
                  "mb-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm",
                  today && "bg-primary text-primary-foreground font-semibold",
                  !today && isCurrentMonth && "text-foreground",
                  !today && !isCurrentMonth && "text-muted-foreground",
                )}
              >
                {day.getDate()}
              </span>

              <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                {/* Tasks shown first */}
                {dayTasks.slice(0, MAX_VISIBLE).map((task) => (
                  <CalendarTaskItem
                    key={task.id}
                    task={task}
                    onToggleComplete={onToggleComplete}
                    compact
                  />
                ))}
                {/* GCal events fill remaining visible slots */}
                {dayGcal
                  .slice(0, Math.max(0, MAX_VISIBLE - dayTasks.length))
                  .map((event) => (
                    <GCalEventItem key={event.id} event={event} compact />
                  ))}
                {overflow > 0 && (
                  <span className="px-1.5 text-xs text-muted-foreground">
                    +{overflow} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
