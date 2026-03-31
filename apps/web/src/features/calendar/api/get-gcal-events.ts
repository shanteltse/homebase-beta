import { useQuery } from "@tanstack/react-query";
import type { GCalExternalEvent } from "@/app/api/calendar/events/route";

export type { GCalExternalEvent };

async function fetchGCalEvents(): Promise<GCalExternalEvent[]> {
  const res = await fetch("/api/calendar/events");
  if (!res.ok) return []; // degrade gracefully — calendar still shows tasks
  return res.json();
}

/** Maps gcalSyncFrequency to how long we consider the fetched events fresh. */
function staleTimeForFrequency(frequency: string | undefined): number {
  if (frequency === "hourly") return 60 * 60 * 1000;        // 1 hour
  if (frequency === "twice_daily") return 6 * 60 * 60 * 1000; // 6 hours
  return 5 * 60 * 1000; // "realtime" → refresh every 5 minutes
}

/**
 * Fetches Google Calendar events that don't originate from HomeBase.
 *
 * @param gcalConnected    Whether the user has connected Google Calendar
 * @param gcalSyncEnabled  Whether sync is enabled in settings
 * @param gcalSyncFrequency The user's chosen sync frequency, used to set stale time
 */
export function useGCalEvents(
  gcalConnected: boolean,
  gcalSyncEnabled: boolean,
  gcalSyncFrequency?: string,
) {
  return useQuery({
    queryKey: ["gcal-events"],
    queryFn: fetchGCalEvents,
    // Only run the query when GCal is actually connected and enabled
    enabled: gcalConnected && gcalSyncEnabled,
    staleTime: staleTimeForFrequency(gcalSyncFrequency),
    // Don't retry on error — a failed fetch just means no GCal events show
    retry: false,
  });
}

/**
 * Filters external GCal events that fall on a specific calendar date.
 * Handles both all-day (YYYY-MM-DD) and timed (ISO datetime) events.
 */
export function getGCalEventsForDate(
  events: GCalExternalEvent[],
  date: Date,
): GCalExternalEvent[] {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  return events.filter((event) => {
    if (event.allDay) {
      // All-day format: "YYYY-MM-DD" — parse as local date components
      const [ey, em, ed] = event.start.split("-").map(Number);
      return ey === y && (em! - 1) === m && ed === d;
    }
    // Timed event: parse ISO string as local date
    const start = new Date(event.start);
    return (
      start.getFullYear() === y &&
      start.getMonth() === m &&
      start.getDate() === d
    );
  });
}
