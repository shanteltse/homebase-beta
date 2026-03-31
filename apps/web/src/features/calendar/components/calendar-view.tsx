"use client";

import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Spinner } from "@repo/ui/spinner";
import { cn } from "@/utils/cn";
import { useTasks } from "@/features/tasks/api/get-tasks";
import { useUpdateTask } from "@/features/tasks/api/update-task";
import { useUserProfile } from "@/features/auth/api/get-user-profile";
import { useGCalEvents } from "../api/get-gcal-events";
import {
  useCalendarState,
  type CalendarView as CalendarViewType,
} from "../hooks/use-calendar-state";
import { MonthView } from "./month-view";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";
import { GoogleCalendarWidget } from "./google-calendar-widget";

const VIEW_OPTIONS: { value: CalendarViewType; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
];

function CalendarViewInner() {
  const { currentDate, view, setView, goNext, goPrev, goToday, goToDate } =
    useCalendarState();
  const { data: tasks, isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const { data: profile } = useUserProfile();
  const showGcal = profile?.showGcalEvents ?? true;
  const { data: gcalEventsRaw = [] } = useGCalEvents(
    profile?.gcalConnected ?? false,
    profile?.gcalSyncEnabled ?? false,
    profile?.gcalSyncFrequency,
  );
  const gcalEvents = showGcal ? gcalEventsRaw : [];

  function handleToggleComplete(taskId: string, completed: boolean) {
    updateTask.mutate({ id: taskId, completed });
  }

  function handleDayClick(date: Date) {
    goToDate(date, "day");
  }

  const label = getNavigationLabel(currentDate, view);

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        {/* Row 1: navigation + view toggle */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToday}>
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goPrev}
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goNext}
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h3 className="heading-xs text-foreground ml-2">{label}</h3>
          </div>

          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border p-0.5 self-start sm:self-auto">
            {VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setView(opt.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  view === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Google Calendar widget */}
        <div className="flex items-center justify-end">
          <GoogleCalendarWidget />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <>
          {view === "month" && (
            <MonthView
              currentDate={currentDate}
              tasks={tasks ?? []}
              gcalEvents={gcalEvents}
              onDayClick={handleDayClick}
              onToggleComplete={handleToggleComplete}
            />
          )}
          {view === "week" && (
            <WeekView
              currentDate={currentDate}
              tasks={tasks ?? []}
              gcalEvents={gcalEvents}
              onDayClick={handleDayClick}
              onToggleComplete={handleToggleComplete}
            />
          )}
          {view === "day" && (
            <DayView
              currentDate={currentDate}
              tasks={tasks ?? []}
              gcalEvents={gcalEvents}
              onToggleComplete={handleToggleComplete}
            />
          )}
        </>
      )}
    </div>
  );
}

export function CalendarView() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      }
    >
      <CalendarViewInner />
    </Suspense>
  );
}

function getNavigationLabel(date: Date, view: CalendarViewType): string {
  if (view === "month") {
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  if (view === "week") {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startMonth = start.toLocaleDateString("en-US", { month: "short" });
    const endMonth = end.toLocaleDateString("en-US", { month: "short" });
    const year = end.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${year}`;
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`;
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
