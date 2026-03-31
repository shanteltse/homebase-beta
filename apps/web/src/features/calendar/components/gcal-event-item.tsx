"use client";

import { cn } from "@/utils/cn";
import type { GCalExternalEvent } from "../api/get-gcal-events";

type GCalEventItemProps = {
  event: GCalExternalEvent;
  compact?: boolean;
};

function formatEventTime(event: GCalExternalEvent): string {
  if (event.allDay) return "All day";
  const start = new Date(event.start);
  return start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Renders a single Google Calendar event.
 * Visually distinct from HomeBase tasks: blue accent, "G" badge.
 *
 * compact=true  — used in month and week views (pill style)
 * compact=false — used in day view (full row style)
 */
export function GCalEventItem({ event, compact = false }: GCalEventItemProps) {
  if (compact) {
    return (
      <div
        title={event.title}
        className={cn(
          "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs",
          "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
          "truncate max-w-full",
        )}
      >
        {/* "G" badge */}
        <span className="shrink-0 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white leading-none">
          G
        </span>
        <span className="truncate">{event.title}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3 py-2.5",
        "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30",
      )}
    >
      {/* "G" badge */}
      <span className="mt-0.5 shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white leading-none">
        G
      </span>
      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <p className="body text-blue-900 dark:text-blue-100 truncate">{event.title}</p>
        <p className="caption text-blue-600 dark:text-blue-400">{formatEventTime(event)}</p>
      </div>
      <span className="shrink-0 rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs text-blue-600 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
        Google Calendar
      </span>
    </div>
  );
}
